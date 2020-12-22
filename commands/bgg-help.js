module.exports = {
    name: 'bgg-help',
    description: 'Get help for bgg bot commands',
    usage: '',
    args: false,
    /**
     * Create Discord Embed for help
     *
     * @return {module:"discord.js".MessageEmbed}
     */
    helpEmbed: async function(message) {
        const Discord = require('discord.js');

        return new Discord.MessageEmbed()
            .setColor('#3f3a60')
            .setTitle('BGG Bot Commands')
            .addFields(
                {
                  name: 'Stats',
                  value: 'BGG Bot is on '+message.client.guilds.cache.size+' servers'
                },
                {
                    name: 'Collection',
                    value: 'Get collection information for a bgg user.\nUsage: `!bgg collection <username>`.\nExample: `!bgg collection jesmaster`'
                },                {
                    name: 'Search',
                    value: 'Get information for a board game from bgg.\nUsage: `!bgg search <game_name>`.\nExample: `!bgg search the resistance`'
                },
                {
                    name: 'Suggest',
                    value: 'Get information for a board game from bgg and allow emjoi reactions for people looking to play. Polling will last an hour.\nUsage: `!bgg suggest <game_name>`.\nExample: `!bgg suggest the resistance`'
                }
            );
    },
    /**
     * Execute Discord Command
     *
     * @param {module:"discord.js".Message} message
     * @param {Array} args
     * @return {Promise<void>}
     */
    execute: async function(message, args) {
        this.helpEmbed(message).then(embed => {
            message.delete();
            message.channel.send(embed);
        });
    }
}