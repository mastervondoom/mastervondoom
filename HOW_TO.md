# Setup — Dynamic Profile (guilyx-style)

Inspired by [guilyx/guilyx](https://github.com/guilyx/guilyx).

## 1. Recent Activity (works out of the box)

The **update-gh-activity** workflow uses the built-in `GITHUB_TOKEN`.

- Go to **Actions** → **update-gh-activity** → **Run workflow**

## 2. Operator Telemetry (WakaTime + GitHub data)

Add these **repository secrets** (`Settings` → `Secrets and variables` → `Actions`):

| Secret | How to get it |
|--------|----------------|
| `GH_TOKEN` | [Personal access token](https://github.com/settings/tokens) with `repo` scope |
| `WAKATIME_API_KEY` | [WakaTime API key](https://wakatime.com/settings/api-key) |

Then run **Actions** → **update-metrics** → **Run workflow**.

## 3. Optional

- **Contribution snake**: run **Generate Snake** workflow once
- Enable **Activity overview** on your GitHub profile settings for the native radar chart
