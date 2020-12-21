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
        let search_query = args.join(' ');

        let params = {
            type: this.types.join(','),
            query: search_query
        };

        if(exact) {
            params.exact = '1';
        }

        const
            querystring = require('querystring'),
            query = querystring.stringify(params),
            cache_type = 'bgg_search',
            cache = await this.cacheGet(cache_type, query),
            fetch = require('node-fetch');

        if(cache !== false) {
            return Promise.resolve(cache);
        }

        const bgg = require('bgg')({
            toJSONConfig: {
                object: true,
                sanitize: false
            }
        });

        return fetch('https://boardgamegeek.com/search/boardgame?q='+search_query, {
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        }).then(
            response => {
                return response.json().then (
                    json => {
                        this.cacheSet(cache_type, query, json);
                        return json;
                    }
                );
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
     * Get Thing ID from bgg search call
     *
     * @param {Object} result
     * @return {{found: (boolean|boolean), thing_id: string}}
     */
    thingIdFromBggSearchCall: function(result) {
        let found = false,
            thing_id = '';

        if (result.items instanceof Array) {
            if (result.items.length > 0) {
                found = true;
                thing_id = result.items[0].objectid;
            }
        }

        return {
            found: found,
            thing_id: thing_id
        }
    },
    /**
     * Create Discord Embed from BGG thing
     *
     * @param {Object} item
     * @return {module:"discord.js".MessageEmbed}
     */
    itemToSearchEmbed: function(item, user) {
        const
            Discord = require('discord.js'),
            he = require('he');

        return new Discord.MessageEmbed()
            .setColor('#3f3a60')
            .setTitle(item.name instanceof Array ? item.name[0].value : item.name.value)
            .setURL(`https://boardgamegeek.com/${item.type}/${item.id}`)
            .setThumbnail(item.thumbnail)
            .setDescription(he.decode(item.description).substr(0, 200)+'...')
            .setAuthor(user.username, user.avatarURL())
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
    thingIdToSearchEmbed: async function(bggSearchResult, message, args) {
        if(bggSearchResult.found) {
            this.bggThing(bggSearchResult.thing_id)
                .then(result => {
                    message.delete();
                    message.channel.send(this.itemToSearchEmbed(result.items.item,  message.author));
                });
        }
        else {
            await message.channel.send(`No results found for "${args.join(' ')}".`);
        }
    },
    /**
     * Create Discord Embed from BGG thing
     *
     * @param {Object} item
     * @return {module:"discord.js".MessageEmbed}
     */
    itemToSuggestEmbed: function(item, user) {
        const
            Discord = require('discord.js'),
            he = require('he');

        return new Discord.MessageEmbed()
            .setColor('#3f3a60')
            .setTitle(item.name instanceof Array ? item.name[0].value : item.name.value)
            .setURL(`https://boardgamegeek.com/${item.type}/${item.id}`)
            .setThumbnail(item.thumbnail)
            .setDescription(he.decode(item.description).substr(0, 200)+'...')
            .setFooter("( 👍 Interested | 📖 Can Teach | ❌ Delete )")
            .setAuthor(user.username, user.avatarURL())
            .addFields(
                {
                    name: ':hash: Number of Players',
                    value: `${item.minplayers.value} - ${item.maxplayers.value}`,
                    inline: true
                },
                {
                    name: ':hourglass: Average Playtime',
                    value: `${item.playingtime.value} min`,
                    inline: true
                },
                {
                    name: `\u200B`,
                    value: `\u200B`,
                    inline: true,
                },
                {
                    name: 'Interested in playing',
                    value: `\u200B`,
                    inline: true,
                },
                {
                    name: 'Can teach',
                    value: '\u200B',
                    inline: true,
                },
            );
    },
    /**
     * Send game embed to channel given thing_id
     *
     * @param {Object} bggSearchResult
     * @param {module:"discord.js".Message} message
     * @param {Array} args
     */
    thingIdToSuggestEmbed: async function(bggSearchResult, message, args) {
        const Discord = require('discord.js');

        if(bggSearchResult.found) {
            this.bggThing(bggSearchResult.thing_id)
                .then(result => {
                    message.channel.send(this.itemToSuggestEmbed(result.items.item, message.author)).then(embedMessage => {
                        let embed_message = embedMessage;

                        embed_message.react("👍");
                        embed_message.react("📖");
                        embed_message.react("❌");

                        const filter = (reaction, user) => {
                            return ['👍', "📖"].includes(reaction.emoji.name) && !user.bot;
                        };
                        const collector = embed_message.createReactionCollector(filter, { dispose: true });

                        collector.on('collect', (reaction, user) => {
                            const receivedEmbed = embed_message.embeds[0];
                            let changedEmbed = new Discord.MessageEmbed(receivedEmbed);
                            let username = `<@${user.id}>\n\u200B`;
                            let field_delta = 3;

                            if (reaction.emoji.name === "📖") {
                                field_delta = 4;
                            }

                            if (changedEmbed.fields[field_delta].value === '\u200B') {
                                changedEmbed.fields[field_delta].value = username;
                            }
                            else {
                                changedEmbed.fields[field_delta].value += username;
                            }

                            embed_message.edit(changedEmbed);
                        }).on('remove', (reaction, user) => {
                            const receivedEmbed = embed_message.embeds[0];
                            let changedEmbed = new Discord.MessageEmbed(receivedEmbed);
                            let username = `<@${user.id}>\n\u200B`;
                            let field_delta = 3;

                            if (reaction.emoji.name === "📖") {
                                field_delta = 4;
                            }

                            changedEmbed.fields[field_delta].value = changedEmbed.fields[field_delta].value.replace(username, '');

                            if (changedEmbed.fields[field_delta].value === '') {
                                changedEmbed.fields[field_delta].value = '\u200B';
                            }

                            embed_message.edit(changedEmbed);
                        });

                        const deleteFilter = (reaction, user) => {
                            return reaction.emoji.name == '❌' && user.id === message.author.id;
                        };
                        const deleteCollector = embed_message.createReactionCollector(deleteFilter);
                        deleteCollector.on('collect', () => {
                            embed_message.delete();
                        });

                    }).catch(err => console.error(err));
                    message.delete();
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
     * @param {Object} commandOptions
     * @return {Promise<void>}
     */
    execute: async function(message, args, commandOptions) {
        this.bggSearch(args, true)
            .then(result => this.thingIdFromBggSearchCall(result))
            .then(bggSearchResult => {
                switch (commandOptions.type) {
                    case 'search':
                        this.thingIdToSearchEmbed(bggSearchResult, message, args);
                        break;
                    case 'suggest':
                        this.thingIdToSuggestEmbed(bggSearchResult, message, args);
                        break;
                }
            })
    },
};