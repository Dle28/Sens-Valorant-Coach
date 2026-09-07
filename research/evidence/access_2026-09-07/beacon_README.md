---
license: cc-by-nc-4.0
pretty_name: BEACON
language:
- en
task_categories:
- tabular-classification
- video-classification
- any-to-any
tags:
- cybersecurity
- behavioral-biometrics
- continuous-authentication
- keystroke-dynamics
- mouse-dynamics
- network-traffic
- gaming
- valorant
- multimodal
- behavioral-authentication
source_datasets:
- original
size_categories:
- 100K<n<1M
---
# BEACON: Behavioral Engine for Authentication and Continuous Monitoring

An anonymized multi-modal behavioral biometric dataset collected during VALORANT gameplay,
designed for continuous user authentication research.

**28 participants · 79 sessions · 445 GB**

Participants are represented by opaque IDs (`P001`–`P028`) and sessions by sequential
IDs (`S001`, `S002`, ...). Raw participant names, consent files, hostnames, MAC
addresses, and direct device IDs are not included in this release.

## Modalities

| Modality | Files | Description |
|----------|-------|-------------|
| `mouse_*.csv` | 80 | Mouse telemetry — position, speed, clicks, scroll; Unix epoch timestamps |
| `keyboard_*.csv` | 80 | Keyboard HID dynamics — key identity, press/release times, duration; Unix epoch timestamps |
| `captured_packets_*.pcap` | 80 | Network traffic — IP/MAC addresses anonymized, local-network discovery traffic removed, encrypted game payload preserved |
| `screen_record_*.mp4` | 74 | Screen recordings of gameplay sessions |
| `hardware_info_*.json` | 79 | Scrubbed hardware metadata (hostname, MAC, IP, serial removed) |

Sessions with multiple recording parts are named `screen_record_P###_S###_part02.mp4` etc.

## File Layout

```
participant_P001/
  session_S001/
    mouse_P001_S001.csv
    keyboard_P001_S001.csv
    captured_packets_P001_S001.pcap
    screen_record_P001_S001.mp4
    hardware_info_P001_S001.json
```

## Metadata

| File | Description |
|------|-------------|
| `metadata/public_participant_session_manifest.csv` | Participant and session ID index |
| `metadata/public_release_manifest.csv` | Per-file modality, status, and size |
| `metadata/sha256_checksums.csv` | SHA-256 checksums for all included files |
| `metadata/beacon_croissant.jsonld` | Croissant ML metadata record |

## Anonymization

- Participant and session folders use opaque sequential IDs
- CSV timestamps are raw Unix epoch values (not session-relative)
- PCAP: Ethernet/IP src and dst addresses replaced with deterministic pseudonyms
  in `10.0.0.0/8`; local-network broadcast/discovery UDP (mDNS, LLMNR, NBNS,
  SSDP, DHCP, WSD) dropped to prevent hostname leakage; encrypted game payload
  and regular DNS preserved intact
- Hardware JSON: hostname, username, MAC, IP, HID, serial, UUID fields removed
- Raw consent files retained privately; see `consent_policy.md`

## Citation

If you use this dataset, please cite it:

Singh, I., Kaur, G., Atwal, U. P. S., Singh, G., Singh, G., & Singh, M. (2026).
BEACON: A Multimodal Dataset for Learning Behavioral Fingerprints from Gameplay Data 
[Data set]. Zenodo. https://doi.org/10.5281/zenodo.20034625
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20034625.svg)](https://doi.org/10.5281/zenodo.20034625)

Singh, I., Singh, G., Kaur, G., Atwal, U. P. S., Singh, G., & Singh, M. (2026). 
BEACON-Logger: A Behavioral Authentication and Network Traffic Logger for Game Environments. 
Zenodo. https://doi.org/10.5281/zenodo.20062628
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20144661.svg)](https://doi.org/10.5281/zenodo.20144661)

Please cite the following paper also:
```bibtex
@misc{singh2026beaconmultimodaldatasetlearning,
      title={BEACON: A Multimodal Dataset for Learning Behavioral Fingerprints from Gameplay Data}, 
      author={Ishpuneet Singh and Gursmeep Kaur and Uday Pratap Singh Atwal and Guramrit Singh and Gurjot Singh and Maninder Singh},
      year={2026},
      eprint={2605.10867},
      archivePrefix={arXiv},
      primaryClass={cs.CR},
      url={https://arxiv.org/abs/2605.10867}, 
}
```

## License

Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)