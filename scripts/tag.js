const { execSync } = require('child_process')

const ALLOWED_VERSION_TYPES = ['major', 'minor', 'patch']
const COLORS = {
    MAGENTA: '\033[95m',
    BLUE: '\033[94m',
    CYAN: '\033[96m',
    GREEN: '\033[92m',
    YELLOW: '\033[33m',
    RED: '\033[91m',
    BOLD: '\033[1m',
    UNDERLINE: '\033[4m',
    RESET: '\033[0m',
}

function throwError(...msg) {
    console.log(COLORS.RED + 'Error:' + COLORS.RESET, ...msg)
    process.exit(1)
}

function exec(cmd) {
    return execSync(cmd).toString()
}

function main() {
    const args = process.argv.filter((e, i) => i > 1)
    const versionType = args[0]

    if (!ALLOWED_VERSION_TYPES.includes(versionType)) {
        throwError(
            'Provide a valid version type!',
            '\n' + ' '.repeat(7) + 'Valid version types are:',
            COLORS.GREEN + ALLOWED_VERSION_TYPES.join(', ') + COLORS.RESET + '.',
        )
    }

    console.log(`Created tag`, COLORS.GREEN + exec(`npm version ${versionType} --git-tag-version`) + COLORS.RESET)
    console.log(`Bumped to version`, COLORS.GREEN + exec('git log -1 --pretty=%B') + COLORS.RESET)
}

main()
