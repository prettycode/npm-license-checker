import axios, { AxiosError } from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import * as semver from 'semver';

type PackageDotJsonDependencyType = 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';

type PackageDotJsonDependency = {
    projectName: string;
    packageName: string;
    packageVersion: string;
    packageLicense?: string;
};

/**
 * Pause execution asynchronously for `ms` milliseconds. Explanation is ignored; serves as a (forced) code comment.
 */
function sleep(explanation: string, ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Move the cursor bax `charCount` characters.
 */
function backupConsole(charCount: number): string {
    return `\u001b[${charCount}D`;
}

/**
 * Convert an array of objects to a CSV string. Does not escape values.
 */
function toCsv(data: Array<PackageDotJsonDependency>): string {
    const header = Object.keys(data[0]).join();
    const rows = data.map((obj) => Object.values(obj).join()).join('\n');

    return `${header}\n${rows}`;
}

/**
 * Return a timestamp string that is safe to use in a filename (no colons).
 */
function filesafeTimestamp(): string {
    return new Date().toISOString().replace(/:/g, '.');
}

/**
 * Fetch the license for a package from the npmjs.org registry. Cache results if the lookup was successful.
 */
async function fetchLicenseForPackage(packageName: string, packageVersion: string): Promise<string> {
    const cacheLocation = fetchLicenseForPackage.prototype;
    let cache: Record<string, string> = cacheLocation.cache;

    if (!cache) {
        cache = cacheLocation.cache = {} as Record<string, string>;
    }

    const cacheKey = `${packageName}@${packageVersion}`;

    if (cache[cacheKey]) {
        return cacheLocation.cache[cacheKey];
    }

    let packageLicense: string;

    if (packageVersion.toLowerCase().startsWith('file:') || packageVersion.toLowerCase().startsWith('link:')) {
        return (cache[cacheKey] = packageLicense = `[SKIPPED: ${packageVersion}]`);
    }

    await sleep("Let's not DoS the npmjs.org registry", 1001);

    const registryUrl = `https://registry.npmjs.org/${packageName}/${packageVersion}`;

    try {
        const fetchResponse = await axios.get<Required<{ license: string }>>(registryUrl);
        cache[cacheKey] = packageLicense = fetchResponse.data.license || '[BLANK]';
    } catch (error) {
        const axiosError = error as AxiosError;
        packageLicense = `[ERROR: ${axiosError.response?.status}: ${axiosError.response?.statusText}]`;
    }

    return packageLicense;
}

/**
 * There're different patterns for versio in package.json; try to get one we can reduce to "x.y.z".
 */
function getCleanNpmPackageVersion(packageJsonVersion: string): string {
    return semver.valid(packageJsonVersion) || semver.valid(semver.coerce(packageJsonVersion)) || packageJsonVersion;
}

/**
 * Get dependencies from all *.json files in the `packageJsons` directory, of type `type`, in one flat array.
 */
async function getDependencies(type: PackageDotJsonDependencyType): Promise<Array<PackageDotJsonDependency>> {
    const packageFilesDir = 'packageJsons';
    const filenames = (await fs.promises.readdir(packageFilesDir)).filter((fn) => fn.endsWith('.json'));
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

/**
 * Output the table data of packages and their licenses to a CSV file.
 */
function writeCsvFile(packages: Array<PackageDotJsonDependency>, type: PackageDotJsonDependencyType): void {
    const csvContent = toCsv(packages);
    const csvFilename = `.${type}.${filesafeTimestamp()}.csv`;

    fs.writeFileSync(csvFilename, csvContent);
}

/**
 * Main function: check dependencies licenses and output the results to the console and a CSV file.
 */
async function checkDependencies(type: PackageDotJsonDependencyType): Promise<Array<PackageDotJsonDependency>> {
    const consoleStream = process.stdout;
    const packages = await getDependencies(type);

    for (const pkg of packages) {
        const { projectName, packageName, packageVersion } = pkg;
        const checkingDisplayMessage = `☐  Checking ${projectName}'s "${type}": ${packageName}@${packageVersion}... `;

        consoleStream.write(checkingDisplayMessage);

        pkg.packageLicense = await fetchLicenseForPackage(packageName, packageVersion);

        if (pkg.packageLicense !== null && typeof pkg.packageLicense === 'object') {
            const type = (pkg.packageLicense as Record<string, string>).type;

            if (typeof type === 'string') {
                pkg.packageLicense = type;
            } else {
                throw new Error('Unrecognized package license definition.');
            }
        }

        consoleStream.write(backupConsole(checkingDisplayMessage.length));
        consoleStream.write(
            `${checkingDisplayMessage.replace('☐', pkg.packageLicense.startsWith('[') ? '✖' : '✔')}${pkg.packageLicense}.\n`
        );
    }

    console.table(packages);

    writeCsvFile(packages, type);

    return packages;
}

async function init() {
    await checkDependencies('dependencies');
    await checkDependencies('devDependencies');
}

(async () => await init())();
