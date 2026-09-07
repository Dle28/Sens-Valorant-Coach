#!/usr/bin/env python3
"""Fetch bounded public metadata and one mouse-file prefix; never fetch full video/PCAP.

This is an access audit, not dataset validation or a license decision.
Usage: python3 scripts/audit_dataset_access.py --output research/evidence/access_DATE
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

MAX_METADATA_BYTES = 2_000_000


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)

    def fetch(name: str, url: str, prefix_bytes: int | None = None) -> dict:
        result = {"name": name, "url": url,
                  "checked_at_utc": datetime.now(timezone.utc).isoformat()}
        headers = {"User-Agent": "Gamesen-research-metadata-audit/0.1"}
        if prefix_bytes is not None:
            headers["Range"] = f"bytes=0-{prefix_bytes - 1}"
        try:
            with urlopen(Request(url, headers=headers), timeout=25) as response:
                limit = prefix_bytes if prefix_bytes is not None else MAX_METADATA_BYTES + 1
                body = response.read(limit)
                if prefix_bytes is None and len(body) > MAX_METADATA_BYTES:
                    raise ValueError("Metadata exceeds 2 MB audit limit")
                result.update({"http_status": response.status,
                               "content_type": response.headers.get("Content-Type"),
                               "content_range": response.headers.get("Content-Range"),
                               "bytes_saved": len(body),
                               "sha256": hashlib.sha256(body).hexdigest(),
                               "prefix_only": prefix_bytes is not None,
                               "local_file": name, "status": "FETCHED"})
            (args.output / name).write_bytes(body)
        except Exception as error:
            result.update({"status": "ACCESS_ERROR", "error": str(error)})
        return result

    initial = [
        ("beacon_hf_api.json", "https://huggingface.co/api/datasets/beacon-gui/BEACON-Dataset"),
        ("beacon_zenodo_api.json", "https://zenodo.org/api/records/20034625"),
        ("kinematic_osf_node.json", "https://api.osf.io/v2/nodes/xd8sm/"),
        ("kinematic_osf_files.json", "https://api.osf.io/v2/nodes/xd8sm/files/osfstorage/?page[size]=100"),
        ("esta_github_api.json", "https://api.github.com/repos/pnxenopoulos/esta"),
        ("esta_commit.json", "https://api.github.com/repos/pnxenopoulos/esta/commits/main"),
        ("fpsci_github_api.json", "https://api.github.com/repos/NVlabs/FPSci"),
        ("fpsci_commit.json", "https://api.github.com/repos/NVlabs/FPSci/commits/master"),
    ]
    with ThreadPoolExecutor(max_workers=6) as pool:
        entries = list(pool.map(lambda pair: fetch(*pair), initial))

    def read_json(name: str) -> dict:
        path = args.output / name
        return json.loads(path.read_text()) if path.exists() else {}

    hf = read_json("beacon_hf_api.json")
    followups = []
    if hf.get("sha"):
        base = f"https://huggingface.co/datasets/beacon-gui/BEACON-Dataset/resolve/{hf['sha']}/"
        for name in ["README.md", "consent_policy.md", "metadata/public_release_manifest.csv",
                     "metadata/public_participant_session_manifest.csv", "metadata/sha256_checksums.csv"]:
            followups.append(("beacon_" + name.replace("/", "_"), base + name))
        mouse_paths = sorted(x["rfilename"] for x in hf.get("siblings", [])
                             if x["rfilename"].split("/")[-1].startswith("mouse_")
                             and x["rfilename"].endswith(".csv"))
        if mouse_paths:
            followups.append(("beacon_mouse_prefix.txt", base + quote(mouse_paths[0]), 8192))
    for prefix, repo, commit_file in [
        ("esta", "pnxenopoulos/esta", "esta_commit.json"),
        ("fpsci", "NVlabs/FPSci", "fpsci_commit.json"),
    ]:
        commit = read_json(commit_file).get("sha")
        if commit:
            base = f"https://raw.githubusercontent.com/{repo}/{commit}/"
            license_name = "LICENSE.txt" if prefix == "fpsci" else "LICENSE"
            followups.extend([(prefix + "_README.md", base + "README.md"),
                              (prefix + "_LICENSE.txt", base + license_name)])
    with ThreadPoolExecutor(max_workers=6) as pool:
        entries.extend(pool.map(lambda item: fetch(*item), followups))

    report = {"audit_kind": "bounded_metadata_and_prefix_access",
              "full_dataset_downloaded": False, "dataset_integrity_validated": False,
              "license_permission_granted_by_audit": False,
              "entries": entries}
    (args.output / "access_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"output": str(args.output), "requests": len(entries),
                      "fetched": sum(x["status"] == "FETCHED" for x in entries),
                      "errors": [{"name": x["name"], "error": x["error"]}
                                 for x in entries if x["status"] != "FETCHED"]},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
