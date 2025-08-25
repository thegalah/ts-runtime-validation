# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.0] - 2024-08-25

### Added
- Comprehensive deterministic output tests for various scenarios
- Extended test coverage for circular references, mixed export types, and parallel processing
- Troubleshooting section in README with common issues and solutions
- Clear cache instructions and documentation
- Project marketing page link in README

### Fixed
- **Critical**: Non-deterministic hash generation causing different output on each run
- File processing order inconsistencies in parallel mode
- Schema map iteration order issues
- Import statement ordering in generated files

### Changed
- All test output directories now use consistent `.test-tmp/` pattern
- Simplified `.gitignore` to use single test output pattern
- Improved README description to better reflect project capabilities

### Internal
- Added sorting to file discovery process
- Ensured consistent ordering in schema processing pipeline
- Fixed Map iteration order throughout codebase
- Sorted all collections before iteration in code generation

## [1.7.0] - 2024

### Added
- **Performance overhaul** with intelligent caching system
- **Parallel processing** support for faster schema generation
- **Progress reporting** with visual feedback
- **Minification** option for production builds
- **Tree-shaking** friendly exports
- **Lazy loading** support for validators
- File-based caching with MD5 hash change detection
- Verbose logging mode for debugging
- Enhanced CLI with new performance options

### Changed
- Refactored library entry point
- Improved README documentation
- Better TypeScript compilation handling

### Fixed
- TTY handling issues
- Windows POSIX path handling in helpers
- TypeScript compilation errors

## [1.6.16] - 2024

### Added
- Progress indicator support
- Namespaced exports feature

### Changed
- Updated dependencies
- Allow duplicate symbols if definitions are identical

### Fixed
- Windows test compatibility
- Non-boolean CLI options handling

## [1.6.15] - 2024

### Added
- Custom tsconfig path support

### Changed
- Documentation updates

## Earlier Versions

For changes in earlier versions, please refer to the git history or npm release notes.

## Migration Guide

### Upgrading to 1.8.0

If you're experiencing hash inconsistencies between runs:

1. Update to version 1.8.0 or later
2. Clear your cache: `rm -rf .ts-runtime-validation-cache`
3. Regenerate your schemas: `ts-runtime-validation --cache`

The deterministic output fix ensures consistent file generation across multiple runs, which is essential for:
- CI/CD pipelines
- Git diff stability
- Build reproducibility
- Cache effectiveness

### Upgrading to 1.7.0

To take advantage of the new performance features:

1. Enable caching for faster incremental builds: `--cache`
2. Keep parallel processing enabled (default): `--parallel`
3. Use progress reporting for long operations: `--progress`
4. For production builds, add: `--minify --tree-shaking`

Example migration:
```bash
# Old command
ts-runtime-validation

# New command with performance optimizations
ts-runtime-validation --cache --progress --minify --tree-shaking
```

---

[Unreleased]: https://github.com/thegalah/ts-runtime-validation/compare/v1.8.0...HEAD
[1.8.0]: https://github.com/thegalah/ts-runtime-validation/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/thegalah/ts-runtime-validation/compare/v1.6.16...v1.7.0
[1.6.16]: https://github.com/thegalah/ts-runtime-validation/compare/v1.6.15...v1.6.16
[1.6.15]: https://github.com/thegalah/ts-runtime-validation/releases/tag/v1.6.15