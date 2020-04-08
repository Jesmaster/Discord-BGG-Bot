module.exports = {
    name: 'bgg-search',
    description: 'Search Boardgamegeek for game info. Args: {game_name}',
    usage: '<game_name>',
    args: true,
    api_url : 'https://boardgamegeek.com',
    types: ['boardgame', 'boardgameexpansion'],
    /**
     * Preforms BGG API search call.
     * First attempt exact name match call. If no results then attempt partial name match.
     *
     * @param {Array} args
     * @param {Boolean} exact
     *
     * @return {Promise<JSON>}
     */
    bggSearch: async function(args, exact = false) {
        const fetch = require('node-fetch');
        const querystring = require('querystring');
        const xml2js = require('xml2js');

        const query = querystring.stringify({
            type: this.types.join(','),
            query: args.join(' ')
        });

        let url = `${this.api_url}/xmlapi2/search?${query}`;
        if(exact) {
            url += '&exact=1';
        }

        return fetch(url)
            .then(response => response.text()
                .then(xml => xml2js
                    .parseStringPromise(xml)
                    .then(result => result)
                    .catch(err => { throw err })
                ));
    },
    /**
     * Preforms BGG API thing call.
     *
     * @param {String} thing_id
     *
     * @return {Promise<JSON>}
     */
    bggThing: async function(thing_id) {
        const fetch = require('node-fetch');
        const querystring = require('querystring');
        const xml2js = require('xml2js');

        const query = querystring.stringify({
            type: this.types.join(','),
            id: thing_id
        });

        return fetch(`${this.api_url}/xmlapi2/thing?${query}`)
            .then(response => response.text()
                .then(xml => xml2js
                    .parseStringPromise(xml)
                    .then(result => result)
                    .catch(err => { throw err })
                ));
    },
    /**
     * Get Thing ID from exact search result
     * @param {Object} result
     * @return {{found: (boolean|boolean), thing_id: string}}
     */
    thingIdFromExactSearch: function(result) {
        let found =
            parseInt(result.items['$'].total, 10) !== 0 &&
            result.items.item[result.items.item.length - 1].name[0]['$'].type === 'primary';
        let thing_id = '';

        //If exact search finds results, return the last (newest game) result
        if(found) {
            thing_id = result.items.item[result.items.item.length - 1]['$'].id ;
        }

        return {
            found: found,
            thing_id: thing_id,
        };
    },
    /**
     * Get Thing ID from fuzzy search result
     * @param {Object} result
     * @return {{found: (boolean|boolean), thing_id: string}}
     */
    thingIdFromFuzzySearch: function(result) {
        let found = parseInt(result.items['$'].total, 10) !== 0;
        let thing_id = '';

        //If fuzzy search finds results, return the first result
        if(found) {
            // noinspection JSPotentiallyInvalidTargetOfIndexedPropertyAccess
            thing_id = result.items.item[0]['$'].id ;
        }

        return {
            found: found,
            thing_id: thing_id,
        };
    },
    /**
     * Create Discord Embed from BGG thing
     *
     * @param {Object} item
     * @return {module:"discord.js".MessageEmbed}
     */
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
    /**
     * Send game embed to channel given thing_id
     * @param {Object} bggSearchResult
     * @param {module:"discord.js".Message} message
     * @param {Array} args
     */
    thingIdToEmbed: async function(bggSearchResult, message, args) {
        if(bggSearchResult.found) {
            this.bggThing(bggSearchResult.thing_id)
                .then(result => {
                    message.channel.send(this.itemToEmbed(result.items.item[0]));
                });
        }
        else {
            await message.channel.send(`No results found for "${args.join(' ')}".`);
        }
    },
    /**
     * Execute Discord Command
     * @param {module:"discord.js".Message} message
     * @param {Array} args
     * @return {Promise<void>}
     */
    execute: async function(message, args) {
        //const inspect = require('eyes').inspector({maxLength: false});

        this.bggSearch(args, true)
            .then(result => this.thingIdFromExactSearch(result))
            .then(bggSearchResult => {
                    if(bggSearchResult.found) {
                        this.thingIdToEmbed(bggSearchResult, message, args)
                    }
                    else {
                        //If exact search fails, run word search instead. Return first result.
                        this.bggSearch(args)
                            .then(result => this.thingIdFromFuzzySearch(result))
                            .then(bggSearchResult => this.thingIdToEmbed(bggSearchResult, message, args));
                    }
                })
    },
};