# Discord-BGG-Bot
Boardgamegeek Integration Bot for Discord

## **Commands**

>`!bgg`
>
>List bot commands
---
>`!bgg search <game_name>`  
>
>Searches for a board game or expansion on BGG and displays a discord embed with the game information upon success.  
>
>First attempts an exact name match, if there are results then it shows the oldest version of the game.
>
>If the exact name match fails it will return the first result for a fuzzy match.
>
>_Example:_ `!bgg search the resistance`  
---
>`!bgg collection <username>`
>
>Search for a collection by a username and displays a discord embed with collection details.
>
>_Example:_ `!bgg collection jesmaster`