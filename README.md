# Package Dependency License Checker

This tool checks the licenses of dependencies in package.json files and outputs the results to the console and a CSV file.

This tool was created to answer this question: out of ~20 node projects, do any have licenses that would prohibit commercial use?

## How to Use

1. **Copy package.jsons**: Copy any number of package.json files into the 'packageJsons' folder. Rename the files to whatever you want but keep the .json extension; all .json files in 'packageJsons' folder will be read by this tool.
2. **Run the Script**: Execute the script via `npm start`.
3. **Review the Results**: The console will display progress and results, and a CSV file will be created in the current directory. Open the CSV in a spreadsheet program and filter by license column.

## Notes

1. This tool was written in a couple of hours, i.e. is a quick/dirty solution.
2. Ideally, this program would be improved to take a list of a git repositories (i.e. URLs of) and go fetch the package.json for each, vs. reading local files copied to `packageJsons`. Reason this was not done: the projects I needed to examine were private repositories, so it was quicker to copy the files vs. figure out the PAT token code required for fetching from the private repos.
