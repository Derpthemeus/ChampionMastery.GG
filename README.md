# ChampionMasteryLookup

You can find a live version at <http://championmasterylookup.derpthemeus.com/>

## Setup

Prerequisites: Node.js, NPM, Git

* Clone the project:
  ```bash
  git clone https://github.com/Derpthemeus/ChampionMasteryLookup.git
  cd ChampionMasteryLookup
  ```
* Install Node dependencies with `npm install`.
* Setup environmental variables and/or change `Config.ts`. The default `Config.ts` expects the environmental variable `RIOT_API_KEY` to be set to a [Riot Games API](https://developer.riotgames.com/) key. This is the only thing that needs to be set to run the server, but you may also want to change other options.
* Compile the TypeScript with `npm run compile`. Make sure you run this before starting the server each time you make changes.
* Start the server with `npm start`.

## Notes

* The technologies that this project uses may change even if the current technologies work fine. I sometimes use this project as a way for me to learn/practice new technologies.
* If you have an idea for a pull request, please [create an issue](https://github.com/Derpthemeus/ChampionMasteryLookup/issues/new) so we can discuss it first. I don't want you to waste your time creating a feature that I don't want to add for some reason.

---
ChampionMasteryLookup isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc.
