"""Launch an owned Kestrel instance, drive existing browser checks, retain proof."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time
import urllib.request

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def doctor(state):
    dll = Path(state["dll"])
    assert hashlib.sha256(dll.read_bytes()).hexdigest() == state["dll_sha256"], "Build changed"
    connections = subprocess.check_output(["netstat", "-ano", "-p", "TCP"], text=True)
    endpoint = state["url"].removeprefix("http://")
    assert any(parts[1] == endpoint and parts[-1] == str(state["pid"])
               for line in connections.splitlines()
               if len(parts := line.split()) >= 5), "Listener not owned by this run"
    result = {"pid": state["pid"], "url": state["url"], "dll_sha256": state["dll_sha256"], "pages": {}}
    for route, marker in [("/", "現在時間"), ("/Clock", 'id="clock-time"')]:
        with urllib.request.urlopen(state["url"] + route, timeout=5) as response:
            body = response.read().decode("utf-8")
            assert response.status == 200 and marker in body, f"Unusable page: {route}"
            result["pages"][route] = response.status
    return result


def run_command(args, log, env=None):
    with log.open("w", encoding="utf-8") as stream:
        stream.write(json.dumps(args) + "\n")
        stream.flush()
        subprocess.run(args, cwd=ROOT, env=env, stdout=stream, stderr=subprocess.STDOUT,
                       check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["run", "doctor"])
    parser.add_argument("--feature", choices=["clock", "navigation", "privacy", "all"], default="clock")
    parser.add_argument("--evidence", type=Path)
    args = parser.parse_args()
    if args.command == "doctor":
        if not args.evidence:
            parser.error("doctor requires --evidence pointing to a currently running instance")
        print(json.dumps(doctor(json.loads((args.evidence / "instance.json").read_text(encoding="utf-8"))), indent=2))
        return

    output = args.evidence.resolve() if args.evidence else Path(tempfile.mkdtemp(prefix="SkillsTestProj-verify-"))
    output.mkdir(parents=True, exist_ok=True)
    assert not (output / "result.json").exists(), "Use a new evidence directory for every run"
    print(f"Evidence: {output}", flush=True)
    server = None
    result = {"outcome": "failed", "feature": args.feature, "unimplemented": ["query", "save", "export"]}
    try:
        dotnet = shutil.which("dotnet")
        node = shutil.which("node")
        assert dotnet and node, "dotnet and node must be on PATH"
        run_command([dotnet, "build", "SkillsTestProj.csproj", "--nologo"], output / "build.txt")
        dll = ROOT / "bin/Debug/net10.0/SkillsTestProj.dll"
        env = os.environ.copy()
        for key in ["ASPNETCORE_URLS", "ASPNETCORE_HTTPS_PORT", "ASPNETCORE_HTTPS_PORTS", "ASPNETCORE_HTTP_PORTS"]:
            env.pop(key, None)
        env.update(ASPNETCORE_ENVIRONMENT="Development", DOTNET_ENVIRONMENT="Development")
        tools = Path(tempfile.gettempdir()) / "SkillsTestProj-clock-verification/node_modules"
        if "NODE_PATH" not in env and tools.is_dir():
            env["NODE_PATH"] = str(tools)
        run_command([node, "-e", "console.log(require.resolve('playwright'))"], output / "tools.txt", env)
        state = {"dll": str(dll), "dll_sha256": hashlib.sha256(dll.read_bytes()).hexdigest()}
        state["git_head"] = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
        state["git_status"] = subprocess.check_output(["git", "status", "--short"], cwd=ROOT, text=True)
        state["source_sha256"] = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
                                    for p in [ROOT / "Program.cs", *sorted((ROOT / "Pages").rglob("*.cshtml")),
                                              ROOT / "wwwroot/js/clock.js", ROOT / "scripts/verify-clock.cjs",
                                              HERE / "verify.py", HERE / "drive.cjs"]}
        with (output / "server.txt").open("w", encoding="utf-8") as log:
            server = subprocess.Popen([dotnet, str(dll), "--urls", "http://127.0.0.1:0"], cwd=ROOT,
                                      env=env, stdout=log, stderr=subprocess.STDOUT)
            state["pid"] = server.pid
            for _ in range(100):
                assert server.poll() is None, "Server exited; see server.txt"
                match = re.search(r"Now listening on: (http://127\.0\.0\.1:\d+)",
                                  (output / "server.txt").read_text(encoding="utf-8", errors="replace"))
                if match:
                    state["url"] = match[1]
                    break
                time.sleep(0.2)
            else:
                raise RuntimeError("Server readiness timeout")
            write_json(output / "instance.json", state)
            write_json(output / "doctor.json", doctor(state))
            run_command([node, str(HERE / "drive.cjs"), state["url"], str(output), args.feature],
                        output / "drive.txt", env)
            if args.feature in ["clock", "all"]:
                run_command([node, str(ROOT / "scripts/verify-clock.cjs"), state["url"], str(output / "clock")],
                            output / "existing-clock.txt", env)
            result["outcome"] = "passed"
    except Exception as error:
        result["error"] = str(error)
    finally:
        if server is not None:
            if server.poll() is None:
                server.terminate()
                try:
                    server.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    server.kill()
                    server.wait(timeout=10)
            result["server_exit_code"] = server.returncode
            result["server_stopped"] = server.poll() is not None
        write_json(output / "result.json", result)
        assert (output / "result.json").is_file(), "Evidence missing after cleanup"
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result["outcome"] != "passed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
