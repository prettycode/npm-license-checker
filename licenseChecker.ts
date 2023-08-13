import axios, { AxiosError } from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import * as semver from 'semver';

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function backupConsole(charCount: number): string {
    return `\u001b[${charCount}D`;
}

function toCSV(data: Array<PackageDotJsonDependency>): string {
    const header = Object.keys(data[0]).join();
    const rows = data.map(obj => Object.values(obj).join()).join('\n');

    return `${header}\n${rows}`;
}

function filesafeTimestamp(): string {
    return new Date().toISOString().replace(/:/g, '.');
}

async function fetchLicenseForPackage(packageName: string, packageVersion: string): Promise<string> {
    const cacheLocation = fetchLicenseForPackage.prototype;
    let cache: Record<string, string> = cacheLocation.cache;

    if (!cache) {
        cache = cacheLocation.cache = {} as Record<string, string>;
    }

    if (cache.hasOwnProperty(packageName)) {
        return cacheLocation.cache[packageName];
    }

    await sleep(1001);

    let packageLicense: string;
    
    try {
        const fetchResponse = await axios.get<Required<{ license: string }>>(
            `https://registry.npmjs.org/${packageName}/${packageVersion}`
        );
    
        cache[packageName] = packageLicense = fetchResponse.data.license || '[BLANK]';
    } catch (error) {
        const axiosError = error as AxiosError;

        packageLicense = `[ERROR: ${axiosError.response?.status}: ${axiosError.response?.statusText}]`;
    }

    return packageLicense;
}

type PackageDotJsonDependencyType = 'dependencies' | 'devDependencies';

type PackageDotJsonDependency = {
    projectName: string;
    packageName: string;
    packageVersion: string;
    packageLicense?: string;
}

function getCleanNpmPackageVersion(packageJsonVersion: string): string {
    return semver.valid(packageJsonVersion) || 
        semver.valid(semver.coerce(packageJsonVersion)) || 
        `[ERROR: UNHANDLED: ${packageJsonVersion}]`;
}

async function getDependencies(type: PackageDotJsonDependencyType): Promise<Array<PackageDotJsonDependency>> {
    const packageFilesDir = 'packageJsons';
    const filenames = (await fs.promises.readdir(packageFilesDir)).filter(fn => fn.endsWith('.json'));
    const allDependencies: Array<PackageDotJsonDependency> = [];

    for (const filename of filenames) {
        const filePath = path.join(packageFilesDir, filename);
        const fileContent = await fs.promises.readFile(filePath, 'utf-8');
        const packageData = JSON.parse(fileContent);
        const packageDependencies = packageData[type] as Record<string, string>;

        if (!packageDependencies) {
            console.warn(`No "${type}" dependencies listed in "${filename}" package.json.`);
            continue;
        }

        for (const [packageName, version] of Object.entries(packageDependencies)) {
            const project = filename.replace(path.extname(filename), ''); 

            allDependencies.push({
                projectName: project,
                packageName,
                packageVersion: getCleanNpmPackageVersion(version)
            });
        }
    }

    return allDependencies;
}

async function checkDependencies(type: PackageDotJsonDependencyType): Promise<Array<PackageDotJsonDependency>> {
    const consoleStream = process.stdout;    
    const packages = await getDependencies(type);

    for (const pkg of packages) {
        const { projectName, packageName, packageVersion } = pkg;
        const checkingDisplayMessage = `☐  Checking ${projectName}'s "${type}": ${packageName}@${packageVersion}... `;

        consoleStream.write(checkingDisplayMessage);
        pkg.packageLicense = await fetchLicenseForPackage(packageName, packageVersion);
        consoleStream.write(backupConsole(checkingDisplayMessage.length));
        consoleStream.write(`${checkingDisplayMessage.replace('☐', pkg.packageLicense.startsWith('[') ? '✖' : '✔')}${pkg.packageLicense}.\n`);
    }

    console.table(packages);
    
    const csvContent = toCSV(packages);
    const csvFilename = `.${type}.${filesafeTimestamp()}.csv`;

    fs.writeFileSync(csvFilename, csvContent);

    return packages;
}

async function init() {
    await checkDependencies('dependencies');
    await checkDependencies('devDependencies');
}

(async () => await init())();