# Discord-BGG-Bot
Boardgamegeek Integration Bot for Discord

## **Commands**

>`!bgg-search <game_name>`  
>
>Searches for a board game or expansion on BGG and displays a discord embed with the game information upon success.  
>
>First attempts a exact name match, if there is one then it shows the newest version of the game.
>
>If the exact name match fails it will return the first result for a fuzzy match.
>
>_Example:_ `!bgg-search the resistance`