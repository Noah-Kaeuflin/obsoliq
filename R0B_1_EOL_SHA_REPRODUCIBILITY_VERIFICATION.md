# R0B.1 EOL-Stable SHA And Fresh-Commit Reproducibility Verification

Date: 2026-08-28
Product: ObsoliQ Inventory Recovery Cockpit
Repository: `C:\\Users\\Noah\\Documents\\Codex\\2026-06-24\\da-s\\outputs\\inventory-recovery-mvp`
Branch: `feature/ir-01-unified-inventory-risks`
Original R0B commit: `f884cbb236c36488839d68b6814999d8acdbc784`

## 1. Scope And Preflight

R0B.1 is limited to the failed R0B EOL/SHA closure. The verified starting state was the exact R0B commit above, with zero tracked modifications and 149 deliberately excluded untracked files. `R0A_IR_DATA_NUMERIC_SAFETY_VERIFICATION.md` and `R0B_RELEASE_INTEGRITY_CLOSURE_VERIFICATION.md` were present. The original R0B commit contains 119 reviewed paths and ten newly tracked Runtime files. No post-R0B tracked Runtime drift was present.

`R0B_1_PREFLIGHT_GATE: PASS`

## 2. Root-Cause Method

Each mismatch was compared across four independent byte sources:

1. the pre-repair worktree;
2. the raw `HEAD` blob from `git show HEAD:<path>`;
3. the same path emitted by `git archive HEAD`;
4. the extracted fresh-copy path.

For every source the audit calculated SHA-256, byte length, CRLF count, lone-LF count, lone-CR count, UTF-8 validity and BOM presence. It then converted only CRLF sequences to LF in memory and compared the resulting bytes. No whitespace trimming, reordering, transcoding or semantic parsing was used.

## 3. Complete 34-Path Hash Inventory

The values below are the immutable diagnosis captured before repair. "Worktree EOL" therefore records the original CSV CRLF state as well as the original LF state of the other 33 paths.

| Path | Worktree SHA-256 | HEAD Blob SHA-256 | Archive SHA-256 | Fresh-Copy SHA-256 | Worktree EOL | Index EOL | Previous attribute |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `assets/icons/obsoliq/obsoliq-icon-sprite.svg` | `f0383857b8544d1c9c5aac66da695f159020afdf256514c0f61b74ed5282a426` | `f0383857b8544d1c9c5aac66da695f159020afdf256514c0f61b74ed5282a426` | `4463285177cf719751984b46794ee21025fa5c0775b95bbe6904ff9a60a01976` | `4463285177cf719751984b46794ee21025fa5c0775b95bbe6904ff9a60a01976` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `data/sample_existing_excel_export.csv` | `3f0b561f6485646409287f8c6648ada123ab6c18028483599320063943e38a76` | `87385830b3fb9e45d1e59451903828018156ea5c3caa0b1428386bfa48fa8a32` | `87385830b3fb9e45d1e59451903828018156ea5c3caa0b1428386bfa48fa8a32` | `87385830b3fb9e45d1e59451903828018156ea5c3caa0b1428386bfa48fa8a32` | CRLF | LF | text=set; eol=lf; encoding=unspecified |
| `scripts/build-pkg-02-review-bundle.cjs` | `a5a1271fb8fdb4c4866c794dfa8e76dcf3da9e3be58a8982407aa27f761bdd97` | `a5a1271fb8fdb4c4866c794dfa8e76dcf3da9e3be58a8982407aa27f761bdd97` | `049cd2b374a508bbc05c54fc5ac58dd53bf1432f32c22b68b0918490ab99c959` | `049cd2b374a508bbc05c54fc5ac58dd53bf1432f32c22b68b0918490ab99c959` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `scripts/generate-sha256-manifest.cjs` | `a0380a7af20cea087e67a83480605f426544996e45fea0c6f7d2ceeda288e9fe` | `a0380a7af20cea087e67a83480605f426544996e45fea0c6f7d2ceeda288e9fe` | `759313ac012cbcd0dde4d5ef1b142df4678bd7a6798d30b9bb833230f84f55f2` | `759313ac012cbcd0dde4d5ef1b142df4678bd7a6798d30b9bb833230f84f55f2` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `scripts/sha256-manifest-lib.cjs` | `ff1b6fc5ee143d0dff1ebd294f2c5e47da0aa1d21548f1a36146b93e23d5d754` | `ff1b6fc5ee143d0dff1ebd294f2c5e47da0aa1d21548f1a36146b93e23d5d754` | `90f9f76e66ec02bdf787997b06cdadcd90c517375a73cc6fdcd17df1c5af0d2b` | `90f9f76e66ec02bdf787997b06cdadcd90c517375a73cc6fdcd17df1c5af0d2b` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `scripts/verify-sha256-manifest.cjs` | `c8459e13ab7eed7dac43eff473c96b405503be9fa4b546055d154565675f515d` | `c8459e13ab7eed7dac43eff473c96b405503be9fa4b546055d154565675f515d` | `4bbf616d14c5c320e0db963a988ab6f1028c34597b332394fa6c18d8901aa35b` | `4bbf616d14c5c320e0db963a988ab6f1028c34597b332394fa6c18d8901aa35b` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/ap-16-4d-3a-product-smoke.cjs` | `1b668601e83470abfb2edb80ee5679039d7eba123724948e276609cbae08e394` | `1b668601e83470abfb2edb80ee5679039d7eba123724948e276609cbae08e394` | `14bb493133562530e774d3d94ca109be36c157aacd8c383ba5a9457250591af2` | `14bb493133562530e774d3d94ca109be36c157aacd8c383ba5a9457250591af2` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/ap-16-4d-3a-static-contract.cjs` | `1e0c7514338218bb981ee2df8ff198e9db140b50d5729c1aee6bf82386c58157` | `1e0c7514338218bb981ee2df8ff198e9db140b50d5729c1aee6bf82386c58157` | `8569731d06d51cb2767211e3f561824c2f3aef8afd02cbd40df8dfe85592974d` | `8569731d06d51cb2767211e3f561824c2f3aef8afd02cbd40df8dfe85592974d` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/ap-16-4d-3b-product-smoke.cjs` | `4c68c506a49c7dd9bedaed023d52dbc5d67954ed77c24494bc407f48742a2592` | `4c68c506a49c7dd9bedaed023d52dbc5d67954ed77c24494bc407f48742a2592` | `9d84c2d6f385ae2885f3bab3f0f2c6f1c31ebc4f8595c67b1f4d88846bb408d0` | `9d84c2d6f385ae2885f3bab3f0f2c6f1c31ebc4f8595c67b1f4d88846bb408d0` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/ap-16-4d-3b-static-contract.cjs` | `cb4244af159ae657838e03224667c881e5ff845a4235ca0b3e0d1116d2a13787` | `cb4244af159ae657838e03224667c881e5ff845a4235ca0b3e0d1116d2a13787` | `31eecad3e79c530bf437417c7b4274ea34e064c62f7d0662842a5dfb944ba9b5` | `31eecad3e79c530bf437417c7b4274ea34e064c62f7d0662842a5dfb944ba9b5` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/ch-ex-01a-product-smoke.cjs` | `41a64cd8a4f1edaaf13c731532a5f0759313dff23b22a2e079bb458fe7c095e1` | `41a64cd8a4f1edaaf13c731532a5f0759313dff23b22a2e079bb458fe7c095e1` | `127afe85e1f062cd7e237e5b3e7c65e12c9e47fffec940c1752c0a8eb015b763` | `127afe85e1f062cd7e237e5b3e7c65e12c9e47fffec940c1752c0a8eb015b763` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/ch-ex-01a-static-contract.cjs` | `eeec1b324cb5fd3129cdcc18857e48685f263b4c1f03d148c1105fd2589abfa5` | `eeec1b324cb5fd3129cdcc18857e48685f263b4c1f03d148c1105fd2589abfa5` | `2fad17f5fd31d8d468b7454ee9aca320d50176d08ee7740f0f7b1d0ce85cf301` | `2fad17f5fd31d8d468b7454ee9aca320d50176d08ee7740f0f7b1d0ce85cf301` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/ex-ux-01-2-product-smoke.cjs` | `20e2560a9b6565a19f47c8b01cc29219e41f838e2f8a1a441480f979e0e9512a` | `20e2560a9b6565a19f47c8b01cc29219e41f838e2f8a1a441480f979e0e9512a` | `f627f0fb0704e5e5d312ddf4088a4d8dde6ddbcd7dfc8d40f704815ecc59ad9e` | `f627f0fb0704e5e5d312ddf4088a4d8dde6ddbcd7dfc8d40f704815ecc59ad9e` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/ex-ux-01-3-1-product-smoke.cjs` | `61db761741ff56bcf55f8e345c58eee2174f0113375ef1ede09af217f9d8eeb1` | `61db761741ff56bcf55f8e345c58eee2174f0113375ef1ede09af217f9d8eeb1` | `a21cca6ce6be30f0e05d916abdced537f15e091d6103c03c4bc8ff98f0d65542` | `a21cca6ce6be30f0e05d916abdced537f15e091d6103c03c4bc8ff98f0d65542` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/ex-ux-01-3-product-smoke.cjs` | `ca0a0cfe31d09adf984939e91089fc3071f596b120db2d7920b7ca1e3d0dc3a7` | `ca0a0cfe31d09adf984939e91089fc3071f596b120db2d7920b7ca1e3d0dc3a7` | `0e15ed8385df98ae88a6695525fb1cf6cfcb7135ef970f9a0df26be0554a11b3` | `0e15ed8385df98ae88a6695525fb1cf6cfcb7135ef970f9a0df26be0554a11b3` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/ex-ux-01-4-product-smoke.cjs` | `fb6d5b4dad8889f2600cc4062d958fcefd98744bab046e7100863ed2c39f3cd7` | `fb6d5b4dad8889f2600cc4062d958fcefd98744bab046e7100863ed2c39f3cd7` | `dad3933a3ce6f0966eec3eb1e49a14fc003784552601a78dd578ccb7b7772c24` | `dad3933a3ce6f0966eec3eb1e49a14fc003784552601a78dd578ccb7b7772c24` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/ex-ux-01-5-product-smoke.cjs` | `dd6d1c6f075d50d6ffd2eb88c0b17dd51fdd1e0f3a42381b1ce5847644b3c02c` | `dd6d1c6f075d50d6ffd2eb88c0b17dd51fdd1e0f3a42381b1ce5847644b3c02c` | `af1570ec10e12d0eb98dcbf02b051bca5b533b95503eaa52e30eb76bcfc237e1` | `af1570ec10e12d0eb98dcbf02b051bca5b533b95503eaa52e30eb76bcfc237e1` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/ex-ux-01-6-product-smoke.cjs` | `de3751a80b5d83fdc62681cf9bf2704654bf9362520691f2b6d7a05b5ce839c6` | `de3751a80b5d83fdc62681cf9bf2704654bf9362520691f2b6d7a05b5ce839c6` | `4ea81e9a2a828fdd36d2fd006c6d3cb665b4e26639e42f8ae1ff2ee9c4ac7908` | `4ea81e9a2a828fdd36d2fd006c6d3cb665b4e26639e42f8ae1ff2ee9c4ac7908` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/generate-num-cal-mig-01-verification.cjs` | `df1818db111f52c427220b0d1b44ffbb93f49283b33f715b8dc44324f93ac223` | `df1818db111f52c427220b0d1b44ffbb93f49283b33f715b8dc44324f93ac223` | `62413fc45074846cadfb410a9031bcb2c948e1270c73f185341dbef94cae5bec` | `62413fc45074846cadfb410a9031bcb2c948e1270c73f185341dbef94cae5bec` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/generate-slow-dead-calibration-baseline.cjs` | `ec0e498d5a70b39bfcde1477812aaa71c8eac8005aa600f4ac04fca9267d51fc` | `ec0e498d5a70b39bfcde1477812aaa71c8eac8005aa600f4ac04fca9267d51fc` | `1fa97f5e839bf6e4eee77863a8b05a995502eb8312eb6662ddc0021abafced37` | `1fa97f5e839bf6e4eee77863a8b05a995502eb8312eb6662ddc0021abafced37` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/generate-slow-dead-calibration-sensitivity.cjs` | `f45081a08ac4eb9dc5733bb8a2ac6367a1d59171de0befb6fa7382a5a1d56d03` | `f45081a08ac4eb9dc5733bb8a2ac6367a1d59171de0befb6fa7382a5a1d56d03` | `990d3eb35970d211727a83e96a1c55dfec997d69eb9877d3fa59df484182ae0d` | `990d3eb35970d211727a83e96a1c55dfec997d69eb9877d3fa59df484182ae0d` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/icon-01-product-smoke.cjs` | `44e0fac7ff4d567e681a0c502ed8f31175986568df990add7475b25733080cf5` | `44e0fac7ff4d567e681a0c502ed8f31175986568df990add7475b25733080cf5` | `9f1344c58371b6ba408f2ce7ed85c9fc84b00215f7b50d2c6cde0ea9838a96bc` | `9f1344c58371b6ba408f2ce7ed85c9fc84b00215f7b50d2c6cde0ea9838a96bc` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/icon-01-static-contract.cjs` | `2cd6f42a3cccb46e0cf0266f655a4db1da92f7dd6f779a53fa1fdacf0f18169b` | `2cd6f42a3cccb46e0cf0266f655a4db1da92f7dd6f779a53fa1fdacf0f18169b` | `6cd48951e0aed577a7e80a6143f1302af829e59a0cb68411c9b43e64391a669b` | `6cd48951e0aed577a7e80a6143f1302af829e59a0cb68411c9b43e64391a669b` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/inventory-risk-smoke-navigation.cjs` | `2dadbbcc227f796d1e3a11858f0746511fb943a2406e09b40306a51b0e55e314` | `2dadbbcc227f796d1e3a11858f0746511fb943a2406e09b40306a51b0e55e314` | `f40112d1d41cb5c9abee5fefd8f1d2fe126633d7de12698be96e9154986bb4fc` | `f40112d1d41cb5c9abee5fefd8f1d2fe126633d7de12698be96e9154986bb4fc` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/ir-01-product-smoke.cjs` | `faefbc602fddf89b51e867d48149188068f6be754ec20b9a3ab23127016ca177` | `faefbc602fddf89b51e867d48149188068f6be754ec20b9a3ab23127016ca177` | `d8e0171f43c7bebadab5ec91dcb428941b3f17945e2c2d391b0ca6635680b645` | `d8e0171f43c7bebadab5ec91dcb428941b3f17945e2c2d391b0ca6635680b645` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/ir-01-static-contract.cjs` | `c044ed7636d98c6be64d1ffbfd081f6605a2678ebbc9b972f248e14f6b5c291a` | `c044ed7636d98c6be64d1ffbfd081f6605a2678ebbc9b972f248e14f6b5c291a` | `2219908c381cf73690a0b6bafe491ff62ff579b808d6354139e6e534684f38b8` | `2219908c381cf73690a0b6bafe491ff62ff579b808d6354139e6e534684f38b8` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/num-cal-mig-01-static-contract.cjs` | `d359a513885040edfc844f7736233e3aab09dd3992f45afa6e62102037bf6f94` | `d359a513885040edfc844f7736233e3aab09dd3992f45afa6e62102037bf6f94` | `216ff679362fed14e6ca5e2d7cdedd8515a78ba242578943829dfee4c4780878` | `216ff679362fed14e6ca5e2d7cdedd8515a78ba242578943829dfee4c4780878` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/pkg-02-manifest-tools.cjs` | `0352ddd8fa306a6ea2d2e33d6cb19b252e2f803f5a6175c98bf1b69e03d38d2d` | `0352ddd8fa306a6ea2d2e33d6cb19b252e2f803f5a6175c98bf1b69e03d38d2d` | `40c5d9c528cd196d7e63e64ce385c43435d04076155c7ef0d43305b0b6d70c60` | `40c5d9c528cd196d7e63e64ce385c43435d04076155c7ef0d43305b0b6d70c60` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/pkg-02-product-smoke.cjs` | `485925ddb846baa5723636f739a903758bc294299f23667fe14510072034e4af` | `485925ddb846baa5723636f739a903758bc294299f23667fe14510072034e4af` | `2b8a90f1eeb0376702cedb0a445882dfe734aeeaa1654c58a92e24bd790f9e05` | `2b8a90f1eeb0376702cedb0a445882dfe734aeeaa1654c58a92e24bd790f9e05` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/pkg-02-static-contract.cjs` | `c76e99e16c7df4c88dc045df6d34b9746b839d7a2d85cf53fe3ce248770b60b8` | `c76e99e16c7df4c88dc045df6d34b9746b839d7a2d85cf53fe3ce248770b60b8` | `10432100b20e7f0ec5895ecc58b82ba39598ff2355f8b1a48205ae496de48048` | `10432100b20e7f0ec5895ecc58b82ba39598ff2355f8b1a48205ae496de48048` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/r0b-static-contract.cjs` | `92756eaa561fb983c3f46778ae4c9ad2fed11927ac79a7819ce0091e535136ee` | `92756eaa561fb983c3f46778ae4c9ad2fed11927ac79a7819ce0091e535136ee` | `73ae9753f1319d0139fd5d5a2f6587a0aa1bbec8956b10444276663d8aaf98c9` | `73ae9753f1319d0139fd5d5a2f6587a0aa1bbec8956b10444276663d8aaf98c9` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/run-browser-suite.cjs` | `aba980385d08901f021d001f720c959b2c084a8be4a9ee5977bf3d4af9c415a0` | `aba980385d08901f021d001f720c959b2c084a8be4a9ee5977bf3d4af9c415a0` | `70b162b2551ff006b7973fdca74ad987bc3a88021d5bbc15a57050d9d09e156f` | `70b162b2551ff006b7973fdca74ad987bc3a88021d5bbc15a57050d9d09e156f` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/run-r0a-targeted.cjs` | `3af52cdaa7eadb93fdde02a43186ee7349cafc5db99affea6ccf11e22d2966fc` | `3af52cdaa7eadb93fdde02a43186ee7349cafc5db99affea6ccf11e22d2966fc` | `f757420d9a3fe3d606031edad38f3c3f5742ae9b5affd87005888908bc3fe173` | `f757420d9a3fe3d606031edad38f3c3f5742ae9b5affd87005888908bc3fe173` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |
| `tests/smoke-runtime.cjs` | `6bef29b573c883430074dd5eba0aae180cf66dd73bacb9d54dd04fac64658aaa` | `6bef29b573c883430074dd5eba0aae180cf66dd73bacb9d54dd04fac64658aaa` | `7ff12eef3e167c63a1622999986da12ad8a564f2829280b62866f2b57e509fe1` | `7ff12eef3e167c63a1622999986da12ad8a564f2829280b62866f2b57e509fe1` | LF | LF | text=auto; eol=unspecified; encoding=unspecified |

## 4. Per-File EOL Proof

The EOL tuple is `CRLF / lone LF / lone CR`. All four byte sources were valid UTF-8 and had equal BOM state (no BOM). "CRLF to LF" compares normalized bytes across all four sources.

| Path | Worktree EOL counts | Blob EOL counts | Archive EOL counts | Fresh EOL counts | BOM equal | UTF-8 | CRLF to LF identical | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `assets/icons/obsoliq/obsoliq-icon-sprite.svg` | 0/44/0 (12000 B, LF) | 0/44/0 (12000 B, LF) | 44/0/0 (12044 B, CRLF) | 44/0/0 (12044 B, CRLF) | yes | valid | yes | EOL-only |
| `data/sample_existing_excel_export.csv` | 101/0/0 (35402 B, CRLF) | 0/101/0 (35301 B, LF) | 0/101/0 (35301 B, LF) | 0/101/0 (35301 B, LF) | yes | valid | yes | EOL-only |
| `scripts/build-pkg-02-review-bundle.cjs` | 0/434/0 (21923 B, LF) | 0/434/0 (21923 B, LF) | 434/0/0 (22357 B, CRLF) | 434/0/0 (22357 B, CRLF) | yes | valid | yes | EOL-only |
| `scripts/generate-sha256-manifest.cjs` | 0/58/0 (1867 B, LF) | 0/58/0 (1867 B, LF) | 58/0/0 (1925 B, CRLF) | 58/0/0 (1925 B, CRLF) | yes | valid | yes | EOL-only |
| `scripts/sha256-manifest-lib.cjs` | 0/606/0 (34000 B, LF) | 0/606/0 (34000 B, LF) | 606/0/0 (34606 B, CRLF) | 606/0/0 (34606 B, CRLF) | yes | valid | yes | EOL-only |
| `scripts/verify-sha256-manifest.cjs` | 0/44/0 (1420 B, LF) | 0/44/0 (1420 B, LF) | 44/0/0 (1464 B, CRLF) | 44/0/0 (1464 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/ap-16-4d-3a-product-smoke.cjs` | 0/100/0 (5277 B, LF) | 0/100/0 (5277 B, LF) | 100/0/0 (5377 B, CRLF) | 100/0/0 (5377 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/ap-16-4d-3a-static-contract.cjs` | 0/167/0 (9503 B, LF) | 0/167/0 (9503 B, LF) | 167/0/0 (9670 B, CRLF) | 167/0/0 (9670 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/ap-16-4d-3b-product-smoke.cjs` | 0/104/0 (5605 B, LF) | 0/104/0 (5605 B, LF) | 104/0/0 (5709 B, CRLF) | 104/0/0 (5709 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/ap-16-4d-3b-static-contract.cjs` | 0/218/0 (13759 B, LF) | 0/218/0 (13759 B, LF) | 218/0/0 (13977 B, CRLF) | 218/0/0 (13977 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/ch-ex-01a-product-smoke.cjs` | 0/97/0 (5432 B, LF) | 0/97/0 (5432 B, LF) | 97/0/0 (5529 B, CRLF) | 97/0/0 (5529 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/ch-ex-01a-static-contract.cjs` | 0/126/0 (6841 B, LF) | 0/126/0 (6841 B, LF) | 126/0/0 (6967 B, CRLF) | 126/0/0 (6967 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/ex-ux-01-2-product-smoke.cjs` | 0/162/0 (8106 B, LF) | 0/162/0 (8106 B, LF) | 162/0/0 (8268 B, CRLF) | 162/0/0 (8268 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/ex-ux-01-3-1-product-smoke.cjs` | 0/107/0 (5610 B, LF) | 0/107/0 (5610 B, LF) | 107/0/0 (5717 B, CRLF) | 107/0/0 (5717 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/ex-ux-01-3-product-smoke.cjs` | 0/100/0 (5283 B, LF) | 0/100/0 (5283 B, LF) | 100/0/0 (5383 B, CRLF) | 100/0/0 (5383 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/ex-ux-01-4-product-smoke.cjs` | 0/181/0 (10709 B, LF) | 0/181/0 (10709 B, LF) | 181/0/0 (10890 B, CRLF) | 181/0/0 (10890 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/ex-ux-01-5-product-smoke.cjs` | 0/388/0 (20626 B, LF) | 0/388/0 (20626 B, LF) | 388/0/0 (21014 B, CRLF) | 388/0/0 (21014 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/ex-ux-01-6-product-smoke.cjs` | 0/201/0 (11961 B, LF) | 0/201/0 (11961 B, LF) | 201/0/0 (12162 B, CRLF) | 201/0/0 (12162 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/generate-num-cal-mig-01-verification.cjs` | 0/318/0 (17622 B, LF) | 0/318/0 (17622 B, LF) | 318/0/0 (17940 B, CRLF) | 318/0/0 (17940 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/generate-slow-dead-calibration-baseline.cjs` | 0/136/0 (10109 B, LF) | 0/136/0 (10109 B, LF) | 136/0/0 (10245 B, CRLF) | 136/0/0 (10245 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/generate-slow-dead-calibration-sensitivity.cjs` | 0/281/0 (17947 B, LF) | 0/281/0 (17947 B, LF) | 281/0/0 (18228 B, CRLF) | 281/0/0 (18228 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/icon-01-product-smoke.cjs` | 0/194/0 (9692 B, LF) | 0/194/0 (9692 B, LF) | 194/0/0 (9886 B, CRLF) | 194/0/0 (9886 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/icon-01-static-contract.cjs` | 0/102/0 (5245 B, LF) | 0/102/0 (5245 B, LF) | 102/0/0 (5347 B, CRLF) | 102/0/0 (5347 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/inventory-risk-smoke-navigation.cjs` | 0/30/0 (2073 B, LF) | 0/30/0 (2073 B, LF) | 30/0/0 (2103 B, CRLF) | 30/0/0 (2103 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/ir-01-product-smoke.cjs` | 0/168/0 (9587 B, LF) | 0/168/0 (9587 B, LF) | 168/0/0 (9755 B, CRLF) | 168/0/0 (9755 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/ir-01-static-contract.cjs` | 0/57/0 (3824 B, LF) | 0/57/0 (3824 B, LF) | 57/0/0 (3881 B, CRLF) | 57/0/0 (3881 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/num-cal-mig-01-static-contract.cjs` | 0/147/0 (8779 B, LF) | 0/147/0 (8779 B, LF) | 147/0/0 (8926 B, CRLF) | 147/0/0 (8926 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/pkg-02-manifest-tools.cjs` | 0/277/0 (16563 B, LF) | 0/277/0 (16563 B, LF) | 277/0/0 (16840 B, CRLF) | 277/0/0 (16840 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/pkg-02-product-smoke.cjs` | 0/86/0 (4545 B, LF) | 0/86/0 (4545 B, LF) | 86/0/0 (4631 B, CRLF) | 86/0/0 (4631 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/pkg-02-static-contract.cjs` | 0/113/0 (5701 B, LF) | 0/113/0 (5701 B, LF) | 113/0/0 (5814 B, CRLF) | 113/0/0 (5814 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/r0b-static-contract.cjs` | 0/45/0 (1969 B, LF) | 0/45/0 (1969 B, LF) | 45/0/0 (2014 B, CRLF) | 45/0/0 (2014 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/run-browser-suite.cjs` | 0/33/0 (1410 B, LF) | 0/33/0 (1410 B, LF) | 33/0/0 (1443 B, CRLF) | 33/0/0 (1443 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/run-r0a-targeted.cjs` | 0/29/0 (1257 B, LF) | 0/29/0 (1257 B, LF) | 29/0/0 (1286 B, CRLF) | 29/0/0 (1286 B, CRLF) | yes | valid | yes | EOL-only |
| `tests/smoke-runtime.cjs` | 0/39/0 (1240 B, LF) | 0/39/0 (1240 B, LF) | 39/0/0 (1279 B, CRLF) | 39/0/0 (1279 B, CRLF) | yes | valid | yes | EOL-only |

Result:

`R0B_1_EOL_ROOT_CAUSE_GATE: PASS`
`EOL_ONLY_MISMATCHES: 34/34`
`NON_EOL_MISMATCHES: 0`

There were no encoding differences, BOM differences, changed logical lines, added spaces, ordering changes or binary-byte changes.

## 5. Exact Cause

The mismatch set consists of 32 CommonJS files, one SVG and one CSV:

- the 32 `.cjs` files and `assets/icons/obsoliq/obsoliq-icon-sprite.svg` already had LF in both worktree and Git blob, but the previous `* text=auto` contract left their EOL unspecified; under the local `core.autocrlf=true` environment, `git archive` emitted CRLF;
- `data/sample_existing_excel_export.csv` already had `*.csv text eol=lf`, so the Git blob and archive were LF, but the pre-R0B manifest had hashed a CRLF worktree copy.

All 33 tracked `.cjs`/`.svg` text paths in scope were exactly the known mismatch set. No binary path and no unrelated historical artifact was pulled into the repair.

## 6. Previous And New Attribute Contract

Previous relevant rules:

```gitattributes
* text=auto
*.js text eol=lf
*.css text eol=lf
*.html text eol=lf
*.md text eol=lf
*.json text eol=lf
*.csv text eol=lf
*.tsv text eol=lf
*.txt text eol=lf
```

The previous contract omitted explicit `.cjs` and `.svg` LF rules.

New canonical contract:

```gitattributes
* text=auto
.gitattributes text eol=lf
*.js text eol=lf
*.cjs text eol=lf
*.css text eol=lf
*.html text eol=lf
*.md text eol=lf
*.json text eol=lf
*.csv text eol=lf
*.svg text eol=lf
*.tsv text eol=lf
*.txt text eol=lf
```

Existing binary rules remain unchanged. The authoritative bytes are the exact LF-canonical text and unchanged binary bytes committed to the Git archive/release payload. Verification remains exact-byte verification; it does not treat CRLF and LF as equivalent.

`R0B_1_ATTRIBUTES_SCOPE_GATE: PASS`
`CANONICAL_TEXT_EOL: LF`

## 7. Normalization And Semantic Preservation

The 34 diagnosed paths were:

- `assets/icons/obsoliq/obsoliq-icon-sprite.svg`
- `data/sample_existing_excel_export.csv`
- `scripts/build-pkg-02-review-bundle.cjs`
- `scripts/generate-sha256-manifest.cjs`
- `scripts/sha256-manifest-lib.cjs`
- `scripts/verify-sha256-manifest.cjs`
- `tests/ap-16-4d-3a-product-smoke.cjs`
- `tests/ap-16-4d-3a-static-contract.cjs`
- `tests/ap-16-4d-3b-product-smoke.cjs`
- `tests/ap-16-4d-3b-static-contract.cjs`
- `tests/ch-ex-01a-product-smoke.cjs`
- `tests/ch-ex-01a-static-contract.cjs`
- `tests/ex-ux-01-2-product-smoke.cjs`
- `tests/ex-ux-01-3-1-product-smoke.cjs`
- `tests/ex-ux-01-3-product-smoke.cjs`
- `tests/ex-ux-01-4-product-smoke.cjs`
- `tests/ex-ux-01-5-product-smoke.cjs`
- `tests/ex-ux-01-6-product-smoke.cjs`
- `tests/generate-num-cal-mig-01-verification.cjs`
- `tests/generate-slow-dead-calibration-baseline.cjs`
- `tests/generate-slow-dead-calibration-sensitivity.cjs`
- `tests/icon-01-product-smoke.cjs`
- `tests/icon-01-static-contract.cjs`
- `tests/inventory-risk-smoke-navigation.cjs`
- `tests/ir-01-product-smoke.cjs`
- `tests/ir-01-static-contract.cjs`
- `tests/num-cal-mig-01-static-contract.cjs`
- `tests/pkg-02-manifest-tools.cjs`
- `tests/pkg-02-product-smoke.cjs`
- `tests/pkg-02-static-contract.cjs`
- `tests/r0b-static-contract.cjs`
- `tests/run-browser-suite.cjs`
- `tests/run-r0a-targeted.cjs`
- `tests/smoke-runtime.cjs`

Of these, the 32 CommonJS files and SVG were already LF and identical to their Git blobs, so no artificial content rewrite was created. The only necessary worktree normalization was:

- `data/sample_existing_excel_export.csv`: 35,402 bytes and 101 CRLF sequences to 35,301 bytes and 101 LF sequences.

Its normalized SHA-256 is `87385830b3fb9e45d1e59451903828018156ea5c3caa0b1428386bfa48fa8a32`, exactly equal to the existing `HEAD` blob. All newly created R0B.1 text files and the policy file use LF without BOM.

For all 34 paths, the sequence of bytes after controlled CRLF-to-LF conversion was unchanged. Line count and every logical line were preserved. There was no formatting, code, documentation, ordering or binary-content change to the diagnosed files.

`R0B_1_EOL_NORMALIZATION_GATE: PASS`

## 8. New Reproducibility Coverage

`tests/r0b-1-eol-manifest-reproducibility.test.cjs` verifies:

- required explicit LF attributes for `.gitattributes`, `.cjs` and `.svg`;
- LF/no-CR/no-BOM for every manifest-relevant text path;
- exact local manifest hashes;
- LF manifest output and repeated byte-identical generation;
- two independent temporary Git repositories with local `core.autocrlf=true`;
- `git archive` hash verification from both repositories;
- path-independent manifest generation;
- exact preservation of all declared binary files;
- fail-closed detection of a deliberately CRLF-mutated manifest path;
- zero source mutations.

The test uses only temporary directories for synthetic writes and deletes only verified test-owned paths beneath the operating-system temp directory.

## 9. Manifest And Regression Record

The immutable PKG-02A baseline remains 182 paths. R0B plus R0B.1 declare 27 explicit additions and zero removals, for 209 manifest entries. The two R0B.1 additions are this report and the EOL reproducibility test.

Final measured pre-commit values:

```text
Manifest verification: 209/209 PASS; missing 0; mismatched 0; unlisted 0; out-of-scope 0
Runtime references missing: 0
Duplicate manifest paths: 0
Package Manifest Tools: PASS (96 checks)
Icon Static Contract: PASS (178 checks)
R0B.1 EOL reproducibility: PASS (1,480 checks; source mutations 0)
JavaScript/CommonJS syntax: 178/178 PASS
Static Contracts: 8/8 PASS
Slow/Dead baseline generator: PASS, byte-identical
Slow/Dead sensitivity generator: PASS, byte-identical
NUM-CAL generator: PASS, byte-identical
R0A regressions: 6/6 PASS (144 assertions)
Structured browser suite: 338/338 PASS
Product Smokes: 12/12 PASS
Page Errors: 0
Unexpected Console Errors: 0
Unexpected External Requests: 0
git diff --check: PASS
```

The single expected forced rollback diagnostic remained classified by the structured harness as expected and was not an unexpected console error.

`R0B_1_EOL_REPRODUCIBILITY_TEST_GATE: PASS`
`R0B_1_MANIFEST_GENERATION_GATE: PASS`
`R0B_1_LOCAL_SHA_VERIFICATION_GATE: PASS`
`R0B_1_PACKAGE_MANIFEST_GATE: PASS`
`R0B_1_ICON_STATIC_CONTRACT_GATE: PASS`
`R0B_1_PRECOMMIT_REGRESSION_GATE: PASS`

The final manifest is always generated after this report reaches its immutable committed form. A repeated generation must be byte-identical. No hash is entered manually.

## 10. Explicit Staging Allowlist

Only the following paths are eligible for the R0B.1 commit:

```text
.gitattributes
R0B_1_EOL_SHA_REPRODUCIBILITY_VERIFICATION.md
SHA256SUMS.txt
scripts/sha256-manifest-lib.cjs
tests/pkg-02-manifest-tools.cjs
tests/r0b-1-eol-manifest-reproducibility.test.cjs
```

The CSV and the other 33 diagnosed files are not staged if their normalized Git blobs equal the existing `HEAD` blobs. Broad add commands remain prohibited.

All 149 pre-existing untracked residual paths remain excluded. This includes historical local evidence outside the current package, review bundles, ZIP/checksum artifacts and other non-allowlisted files. None may enter the R0B.1 commit.

## 11. Commit And Fresh Reconstruction Record

This report is itself a committed and manifest-hashed input. Therefore its own final commit SHA cannot be embedded into its bytes without a cryptographic self-reference cycle. The exact new commit SHA and the final `git archive HEAD` acceptance result are recorded by the external final execution record after the report and manifest are frozen. This is the same immutable-evidence boundary used by the existing package closure: the report specifies the acceptance contract and does not preclaim a post-commit result.

Before commit, the exact staged tree is reconstructed and verified. After commit, the same committed tree is reconstructed again exclusively through `git archive HEAD`. The latter must prove zero SHA mismatches before any later fresh test is allowed to continue.

`R0B1_POST_COMMIT_RESULT_RECORDED_EXTERNALLY`

## 12. Governance And Release Boundary

R0B.1 supersedes only the failed EOL/SHA and Fresh-Commit gates in the historical R0B report. It does not rewrite that report and does not replace an independent trust review.

`REL_001_STATUS` may become `FIXED` only after the final fresh-commit run passes. Regardless of that technical closure:

```text
TRUST_01_GATE: OPEN
PRODUCT_RELEASE_GATE: HOLD
AUTHORIZED_RELEASE: NO
PUSH_PERFORMED: NO
TAG_CREATED: NO
NEXT_AUTHORIZED_SCOPE: TRUST-01
```

No amend, reset, restore, checkout, clean, stash, rebase, merge, push, tag, broad add or global/system Git configuration change is authorized or performed.
