# For the Unreal source repo

These two files belong in the root of the "pinescapevr" repo once the
uncompiled Unreal project is pushed there (see `todolist.txt` Phase 2:
"Decide on a license" and "Push the uncompiled Unreal project to its own
GitHub repo"). They live here for now since that repo doesn't exist yet.

- `LICENSE`: MIT license, copyright held by The Jones Center at Ichauway.
  Covers the Pinescape project code you write. It does not, and cannot,
  relicense Unreal Engine itself, distributing a build still falls under
  Epic Games' own Unreal Engine EULA, same as any UE project.
- `CITATION.cff`: machine-readable citation info (GitHub renders a "Cite
  this repository" button from it automatically once it's in the repo
  root). Lists the full About page team as authors. Update
  `repository-code`, `version`, and `date-released` as needed when you
  actually push and tag the repo, the values here are placeholders based
  on the current v1.0 release.

When you're ready to push the Unreal project, copy both files into that
repo's root and delete this folder from pinescape.org.
