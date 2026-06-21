set dotenv-load

mac_project := "apps/mac/EpheMac.xcodeproj"
mac_scheme := "EpheMac"
mac_derived_data := "/tmp/ephe-mac-derived"
mac_app := mac_derived_data + "/Build/Products/Debug/Ephe.app"

default:
    @just --list

mac-build:
    xcodebuild -project {{mac_project}} -scheme {{mac_scheme}} -destination 'platform=macOS' -derivedDataPath {{mac_derived_data}} build

mac-run: mac-build
    open -n {{mac_app}}

mac-test:
    xcodebuild -project {{mac_project}} -scheme {{mac_scheme}} -destination 'platform=macOS' -derivedDataPath {{mac_derived_data}} test -only-testing:EpheMacTests

mac-test-ui:
    xcodebuild -project {{mac_project}} -scheme {{mac_scheme}} -destination 'platform=macOS' -derivedDataPath {{mac_derived_data}} test -only-testing:EpheMacUITests

mac-benchmark vault:
    rm -f /tmp/ephe-benchmark-results.txt
    printf '%s\n' "{{vault}}" > /tmp/ephe-benchmark-vault-path
    xcodebuild -project {{mac_project}} -scheme {{mac_scheme}} -destination 'platform=macOS' -derivedDataPath {{mac_derived_data}} test -only-testing:EpheMacTests/VaultPerformanceBenchmarks/testVaultPerformance >/tmp/ephe-benchmark-xcodebuild.log 2>&1
    cat /tmp/ephe-benchmark-results.txt
    printf '\n'
    rm -f /tmp/ephe-benchmark-vault-path

mac-benchmark-ui vault:
    printf '%s\n' "{{vault}}" > /tmp/ephe-ui-benchmark-vault-path
    xcodebuild -project {{mac_project}} -scheme {{mac_scheme}} -destination 'platform=macOS' -derivedDataPath {{mac_derived_data}} test -only-testing:EpheMacUITests/EpheMacUITests/testBenchmarkRealVaultOpen >/tmp/ephe-ui-benchmark-xcodebuild.log 2>&1
    rg 'EPHE_UI_BENCHMARK_SUMMARY|TEST SUCCEEDED|TEST FAILED' /tmp/ephe-ui-benchmark-xcodebuild.log
    rm -f /tmp/ephe-ui-benchmark-vault-path

mac-clean:
    rm -rf {{mac_derived_data}}

tauri-dev:
    pnpm --dir apps/tauri tauri:dev

tauri-build:
    pnpm --dir apps/tauri tauri:build

tauri-check:
    pnpm --dir apps/tauri build
    pnpm --dir apps/tauri tauri:check

tauri-benchmark notes="5000":
    EPHE_TAURI_BENCH_NOTES={{notes}} cargo test --manifest-path apps/tauri/src-tauri/Cargo.toml benchmark_synthetic_vault_operations -- --ignored --nocapture

tauri-dev-vault vault:
    EPHE_TAURI_VAULT="{{vault}}" pnpm --dir apps/tauri tauri:dev
