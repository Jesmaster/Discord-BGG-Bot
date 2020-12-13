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
                    value: 'Get collection information for a bgg user.\nUsage: `!collection <username>`.\nExample: `!bgg collection jesmaster`'
                },
                {
                    name: 'Suggest',
                    value: 'Get information for a board game from bgg.\nUsage: `!suggest <game_name>`.\nExample: `!suggest the resistance`'
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