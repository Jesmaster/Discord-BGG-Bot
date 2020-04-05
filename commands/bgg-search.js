module.exports = {
    name: 'bgg-search',
    description: 'Search Boardgamegeek for game info. Args: {game_name}',
    usage: '<game_name>',
    args: true,
    parseXml: function(xml) {
        const xml2js = require('xml2js');

        xml2js.parseString(xml, function (err, result) {
            return result;
        });

        return false;
    },
    /**
     * Preforms BGG API search call.
     * First attempt exact name match call. If no results then attempt partial name match.
     *
     * @param {Array} args
     * @param {Boolean} exact
     *
     * @return {Promise<string>}
     */
    bggSearch: async function(args, exact = false) {
        const fetch = require('node-fetch');
        const querystring = require('querystring');

        const query = querystring.stringify({ query: args.join(' ') });

        let url = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&${query}`;
        if(exact) {
            url += '&exact=1';
        }

        try {
            fetch(url)
                .then(response => response.text()
                    .then(xml => { return this.parseXml(xml) })
                );
        } catch(error) {}
    },
    bggThing: async function(thing_id) {
        const fetch = require('node-fetch');

        fetch(`https://boardgamegeek.com/xmlapi2/thing?type=boardgame,boardgameexpansion&id=${thing_id}`)
            .then(response => response.text()
                .then(xml => { return this.parseXml(xml) }));
    },
    itemToEmbed: function(item) {
        const Discord = require('discord.js');
        const he = require('he');

        return new Discord.MessageEmbed()
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
    },
    execute: async function(message, args) {
        const inspect = require('eyes').inspector({maxLength: false});

        this.bggSearch(args, true).then(
            result => {
                let found = parseInt(result.items['$'].total, 10) !== 0;

                return {
                    found: found,
                    thing_id: found ? result.items.item[0]['$'].id : '',
                };
            }
        ).then(
            bggSearchResult => {
                if(bggSearchResult.found) {
                    return bggSearchResult.thing_id;
                }
                else {
                    this.bggSearch(args).then(
                        result => {
                            if(parseInt(result.items['$'].total, 10) !== 0) {
                                return result.items.item[0]['$'].id;
                            }
                        }
                    )
                }

                message.channel.send(`No results found for "${args.join(' ')}".`);
                return '';
            }
        ).then(thing_id => {
            this.bggThing(thing_id)
                .then(result => {
                    message.channel.send(this.itemToEmbed(result.items.item[0]));
                });
        });
    },
};