# D1 evidence — HF platform facts verified against Hugging Face's own docs

Date: 2026-10-05. Every claim in `docs/HF_MIGRATION.md` § 1 traces to one of the raw
outputs below; § 2 traces to the negative results.

## Raw commands and outputs

Working dir: `/home/z/my-project/scripts/round17/`.

```
$ for p in spaces-sdks-docker spaces-overview spaces-storage spaces-secrets-manage spaces-sdks-docker-secrets spaces-run-variant custom-domains-spaces spaces-settings; do curl -s "https://huggingface.co/docs/hub/$p" -o "hf-$p.html" && echo "$p: $(wc -c < hf-$p.html) bytes"; done
spaces-sdks-docker: 222695 bytes
spaces-overview: 221554 bytes
spaces-storage: 183850 bytes
spaces-secrets-manage: 52642 bytes
spaces-sdks-docker-secrets: 52652 bytes
spaces-run-variant: 52636 bytes
custom-domains-spaces: 52642 bytes
spaces-settings: 179658 bytes

$ python3 -c "... <title> extraction ..."
spaces-sdks-docker: Docker Spaces · Hugging Face
spaces-overview: Spaces Overview · Hugging Face
spaces-storage: Disk usage on Spaces · Hugging Face
spaces-settings: Spaces Settings · Hugging Face
spaces-sdks-docker-secrets: 404 – Hugging Face          # negative result
```

## App-port / SDK / secrets / disk / permissions (Docker Spaces doc, verbatim excerpts)

```
$ grep -oiE ".{140}app_port.{180}" docker-spaces.txt
...set sdk: docker inside the YAML block at the top of your Spaces README.md file.
You can also change the default exposed port 7860 by setting app_port: 7860 ...
--- title: Basic Docker SDK Space ... sdk: docker app_port: 7860 ---

$ grep -oiE ".{140}(secret|Data Persistence).{180}" docker-spaces.txt
Secrets and Variables Management ... Variables Buildtime Variables are passed as
build-arg s when building your Docker Space ... Secrets Buildtime In Docker Spaces,
the secrets management is different for security reasons. ... reading it with
$(cat /run/secrets/SECRET_EXAMPLE) ... Runtime Same as for public Variables, at
runtime, you can access the secrets as environment variables.
...
Data Persistence The data written on disk is lost whenever your Docker Space
restarts. To persist data across restarts, you can attach a Storage Bucket to your
Space. At the moment, /data volume is only available at runtime, i.e. you cannot
use /data during the build step of your Dockerfile.

$ grep -oiE ".{100}(user ID 1000|WORKDIR).{160}" docker-spaces.txt
Permissions The container runs with user ID 1000. To avoid permission issues you
should create a user and set its WORKDIR before any COPY or download.
```

## Hardware / sleep / URL / networking (Spaces Overview doc, verbatim excerpts)

```
$ grep -oiE ".{100}(cpu basic|2 vCPU|16 GB|8 vCPU|32 GB).{140}" spaces-overview.txt
...is limited to 16GB RAM, 2 CPU cores and 50GB of (not persistent) disk space by
default. The default CPU Basic hardware has no hourly cost, but creating a Space
that runs on compute (Gradio or Docker) requires a paid plan, while Static Spaces
are free...
Hardware CPU Memory GPU Memory Hourly Price CPU Basic 2 vCPU 16 GB FREE CPU
Upgrade 8 vCPU 32 GB $0.03 Nvidia T4 - small 4 vCPU 15 GB 16 GB $0.40 ...

$ grep -oiE ".{160}(sleep|48 hours|pauses).{160}" spaces-overview.txt
Lifecycle management On free hardware, your Space will "go to sleep" and stop
executing after a period of time if unused. If you wish for your Space to run
indefinitely, consider upgrading to paid hardware. You can also manually pause
your Space from the Settings tab.

$ grep -ohiE ".{120}hf\.space.{120}" spaces-overview.txt
...the running app is publicly accessible through its embed URL
( https://<space-subdomain>.hf.space ) or through a custom domain when one is
configured...
...SPACE_HOST : osanseviero-i-like-flan.hf.space ...
```

## Custom domain (Spaces Custom Domain doc, verbatim excerpt)

```
Copy page Spaces Custom Domain This feature is part of PRO or Team & Enterprise
plans. ... Custom domains require your Space to have public or protected
visibility. They are not supported on private Spaces. ... You'll need to add a
CNAME record pointing your domain to hf.space ...
```

## Pricing (huggingface.co/pricing, verbatim excerpts)

```
PRO Account Boost your personal HF experience $9 /month
... Spaces Host your own ZeroGPU, Gradio & Docker Spaces on compute ...
... Name CPU Memory Accelerator VRAM Hourly price CPU Basic 2 vCPU 16 GB - -
FREE CPU Upgrade 8 vCPU 32 GB - - $0.03 ...
```

## Negative results (unverified-facts ledger in the plan doc)

```
$ grep all fetched HF pages for /48\s*hour|48h|sleep time|custom sleep/i
# -> zero matches in: spaces-sdks-docker, spaces-overview, spaces-storage,
#    spaces-settings, spaces-dev-mode, custom-domain, pricing, spaces-landing.
# The 48-hour sleep figure and the "cpu-basic can't set a custom sleep time"
# claim are NOT stated in the fetched HF documentation (2026-10-05).
```

## Current-app measured facts cited in the plan

```
$ jq .scripts package.json   # build = "next build", start = "next start"
$ git grep -l "export const revalidate" -- app | wc -l
4                            # ISR segment configs: 60s x2, 120s, 3600s
$ git grep -c "rishi-terminal.vercel.app" -- . ':!docs' ':!package-lock.json' | wc -l
34                           # 33 files + CONSTITUTION.md (untouchable, rule: founder approval)
$ next.config.ts             # no Vercel-only options present (verified by read)
```
