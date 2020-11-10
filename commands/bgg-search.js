module.exports = {
    name: 'bgg-search',
    description: 'Search Boardgamegeek for game info. Args: <game_name>',
    usage: '<game_name>',
    args: true,
    types: ['boardgame', 'boardgameexpansion'],
    cache_folder: '.bgg_bot_cache',
    cache_ttl: 1000 * 60 * 60,
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
        let params = {
            type: this.types.join(','),
            query: args.join(' ')
        };

        if(exact) {
            params.exact = '1';
        }

        const
            querystring = require('querystring'),
            query = querystring.stringify(params),
            cache_type = 'bgg_search',
            cache = await this.cacheGet(cache_type, query);

        if(cache !== false) {
            return Promise.resolve(cache);
        }

        const bgg = require('bgg')({
            toJSONConfig: {
                object: true,
                sanitize: false
            }
        });

        return bgg('search', params).then(
            result => {
                this.cacheSet(cache_type, query, result);
                return result;
            }
        )
    },
    /**
     * Preforms BGG API thing call.
     *
     * @param {String} thing_id
     *
     * @return {Promise<JSON>}
     */
    bggThing: async function(thing_id) {
        const
            cache_type = 'bgg_thing',
            cache = await this.cacheGet(cache_type, thing_id);

        if(cache !== false) {
            return Promise.resolve(cache);
        }

        const
            params = {
                type: this.types.join(','),
                id: thing_id
            },
            bgg = require('bgg')({
                toJSONConfig: {
                    object: true,
                    sanitize: false
                }
            });

        return bgg('thing', params).then(
            result => {
                this.cacheSet(cache_type, thing_id, result);
                return result;
            }
        )
    },
    /**
     * Pull from BGG Bot Cache
     *
     * @param {string} cache_type
     * @param {string} cache_key
     * @return {JSON|boolean}
     */
    cacheGet: async function(cache_type, cache_key) {
        const
            Keyv = require('keyv'),
            KeyvFile = require('keyv-file'),
            keyv = new Keyv({
                store: new KeyvFile({
                    filename: `./${this.cache_folder}/${cache_type}.json`
                })
            });

        let cache = await keyv.get(cache_key);
        if(typeof cache !== 'undefined'){
            return cache;
        }

        return false;
    },
    /**
     * Set data for BGG Bot Cache
     *
     * @param {String} cache_type
     * @param {String} cache_key
     * @param {JSON} cache_data
     */
    cacheSet: async function(cache_type, cache_key, cache_data) {
        const
            Keyv = require('keyv'),
            KeyvFile = require('keyv-file'),
            keyv = new Keyv({
                store: new KeyvFile({
                    filename: `./${this.cache_folder}/${cache_type}.json`
                })
            });

        await keyv.set(cache_key, cache_data, this.cache_ttl);
    },
    /**
     * Get Thing ID from exact search result
     *
     * @param {Object} result
     * @return {{found: (boolean|boolean), thing_id: string}}
     */
    thingIdFromExactSearch: function(result) {
        let
            found = parseInt(result.items.total, 10) !== 0,
            thing_id = '';

        if(found) {
            found = result.items.item instanceof Array ?
                found && result.items.item[0].name.type === 'primary' :
                found && result.items.item.name.type === 'primary';
        }

        //If exact search finds results, return the first (oldest game) result
        if(found) {
            thing_id = result.items.item instanceof Array ?
                result.items.item[0].id :
                result.items.item.id;
        }

        return {
            found: found,
            thing_id: thing_id,
        };
    },
    /**
     * Get Thing ID from fuzzy search result
     *
     * @param {Object} result
     * @return {{found: (boolean|boolean), thing_id: string}}
     */
    thingIdFromFuzzySearch: function(result) {
        let
            found = parseInt(result.items.total, 10) !== 0,
            thing_id = '';

        //If fuzzy search finds results, return the first result
        if(found) {
            // noinspection JSPotentiallyInvalidTargetOfIndexedPropertyAccess
            thing_id = result.items.item instanceof Array ?
                result.items.item[0].id :
                result.items.item.id;
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
        const
            Discord = require('discord.js'),
            he = require('he');

        return new Discord.MessageEmbed()
            .setColor('#3f3a60')
            .setTitle(item.name instanceof Array ? item.name[0].value : item.name.value)
            .setURL(`https://boardgamegeek.com/${item.type}/${item.id}`)
            .setThumbnail(item.thumbnail)
            .setDescription(he.decode(item.description).substr(0, 200)+'...')
            .addFields(
                {
                    name: 'Number of Players',
                    value: `${item.minplayers.value} - ${item.maxplayers.value}`,
                    inline: true
                },
                {
                    name: 'Average Playtime',
                    value: `${item.playingtime.value} min`,
                    inline: true
                }
            );
    },
    /**
     * Send game embed to channel given thing_id
     *
     * @param {Object} bggSearchResult
     * @param {module:"discord.js".Message} message
     * @param {Array} args
     */
    thingIdToEmbed: async function(bggSearchResult, message, args) {
        if(bggSearchResult.found) {
            this.bggThing(bggSearchResult.thing_id)
                .then(result => {
                    message.delete();
                    message.channel.send(this.itemToEmbed(result.items.item));
                });
        }
        else {
            await message.channel.send(`No results found for "${args.join(' ')}".`);
        }
    },
    /**
     * Execute Discord Command
     *
     * @param {module:"discord.js".Message} message
     * @param {Array} args
     * @return {Promise<void>}
     */
    execute: async function(message, args) {
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