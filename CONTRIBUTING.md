## How to contribute

Hi, it's amazing having a community willing to push new feature to the app, and I am VERY open to contributors pushing their idea, it's what makes open source amazing.

That said for the sake of sanity let's all follow the same structure:

**Make sure to have sizeable data while working on features**

You can easily generate 50 notes and 50 checklists/tasks with the handy tool:

`yarn mock:data:notes <username>`
`yarn mock:data:lists <username>`

Obviously replace `<username>` with any user you are testing with, notes/checklists will be generated within the user folder.

**Follow some simple rules**

- Please if you use AI, make sure to clean up the code and don't leave obvious bloat.
- Make sure to use translation keys, I don't want to see hardcoded strings anywhere. Please check [howto/TRANSLATIONS.md](howto/TRANSLATIONS.md) for more info.
- Use pre-existing components, keep styling consistent, please don't hardcode html classes/inline styling, especially if a component alraedy exists. There's global UI components in [app/_components/GlobalComponents/](app/_components/GlobalComponents/) and anything with features should be added in [app/_components/FeatureComponents/](app/_components/FeatureComponents/)
- When creating a new branch, do off from the `develop` branch, this will always be ahead of `main` and it's what gets released.
- When creating a pull request, direct it back into `develop`, I' ll then review it and merge it. Your code will end up in the next release that way and we all avoid conflicts! Pipelines will fail if you point merge requests to anything that's not develop.
- Save yourself some time and run linting/type checks and tests locally, pipelines will fail if these fail!

Please bear with on reviews, it may take a bit of time for me to go through it all on top of life/work/hobbies :)
