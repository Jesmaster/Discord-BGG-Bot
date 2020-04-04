module.exports = {
    name: 'bgg-search',
    description: 'Search Boardgamegeek for game info. Args: {game_name}',
    usage: '<game_name>',
    args: true,
    execute: async function(message, args) {
        const Discord = require('discord.js');
        const fetch = require('node-fetch');
        const he = require('he');
        //const inspect = require('eyes').inspector({maxLength: false});
        const querystring = require('querystring');
        const xml2js = require('xml2js');

        const query = querystring.stringify({ query: args.join(' ') });

        fetch(`https://boardgamegeek.com/xmlapi2/search?type=boardgame&${query}`).then(response => {
            response.text().then(xml => {
                xml2js.parseString(xml, function (err, result) {
                    if(parseInt(result.items['$'].total, 10) === 0){
                        message.channel.send(`No results found for "${args.join(' ')}".`);
                    }
                    else {
                        const thing_id = result.items.item[0]['$'].id;
                        fetch(`https://boardgamegeek.com/xmlapi2/thing?type=boardgame,boardgameexpansion&id=${thing_id}`).then(response => {
                            response.text().then(xml => {
                                xml2js.parseString(xml, function(err, result) {
                                    const item = result.items.item[0];

                                    const embed = new Discord.MessageEmbed()
                                        .setColor('#3f3a60')
                                        .setTitle(item.name[0]['$'].value)
                                        .setURL(`https://boardgamegeek.com/${item['$'].type}/${item['$'].id}`)
                                        .setThumbnail(item.thumbnail[0])
                                        .setDescription(he.decode(item.description[0]).substr(0, 200)+'...')
                                        .addFields(
                                            {
                                                name: 'Number of Players',
                                                value: `${item.minplayers[0]['$'].value} - ${item.maxplayers[0]['$'].value}`,
                                                inline: true
                                            },
                                            {
                                                name: 'Average Playtime',
                                                value: `${item.playingtime[0]['$'].value} min`,
                                                inline: true
                                            }
                                        );

                                    message.channel.send(embed)
                                });
                            });
                        });
                    }
                });
            });
        });
    },
};