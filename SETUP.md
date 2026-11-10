# Publishing this profile

Copy the contents of this folder into the root of `smahmed776/smahmed776`, including `assets/`, `scripts/` and the hidden `.github/` directory. `README.md` is the profile; `SETUP.md` is this installation note and may be omitted. The included SVG cards already contain a real GitHub API snapshot, so the README renders before its first workflow run. No remote repository was changed while preparing this package.

The header is a local SVG. Both activity cards include light and dark variants. They are stored in the repository rather than depending on an external stats-image service. The only remote images are the four optional Shields.io link badges.

## Refreshing activity

After publishing, open **Actions → Refresh profile activity → Run workflow**. The workflow also runs daily at 06:17 UTC. GitHub may delay scheduled runs or disable schedules in inactive public repositories. The workflow preserves existing cards if GitHub returns an error. Repository rules or Actions policy may require changes to allow the bot's asset commits.

The default `GITHUB_TOKEN` only has the repository access GitHub grants the workflow. For anonymised private counts, enable **Your profile → Contribution settings → Private contributions**. GitHub can then expose private contribution counts without exposing names or code. Visibility, SSO and GitHub's contribution rules can still affect totals. The cards use the API's calendar total as returned. Active days, active weeks, longest run, busiest day and busiest month are derived from that same calendar. No unseen commit or PR count is guessed; no private count is added twice.

No personal access token is required by the workflow. It uses GitHub's built-in token, with `contents: write` permission solely to commit the refreshed SVG files.

The query requests aggregate contribution counts and calendar days only. It never requests repository names, file contents, private issue titles or messages. Generating an SVG makes its aggregate counts public once the SVG is published. The cards report a rolling year of GitHub contributions, not every commit across every branch or all lifetime work. Their “Updated” date uses Europe/London; calendar days use GitHub's UTC dates.

To refresh locally with Node.js 20+ and an authenticated GitHub CLI:

```bash
node scripts/update-stats.mjs
```

## Sources

- [GitHub profile READMEs](https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme)
- [Private contribution visibility](https://docs.github.com/en/account-and-profile/how-tos/contribution-settings/manage-visibility-settings-for-private-contributions-and-achievements)
- [GitHub contribution and calendar API fields](https://docs.github.com/en/graphql/reference/users#contributionscollection)
