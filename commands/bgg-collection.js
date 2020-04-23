module.exports = {
    name: 'bgg-collection',
    description: 'Search Boardgamegeek for collection info. Args: <username>',
    usage: '<username>',
    args: true,
    cache_folder: '.bgg_bot_cache',
    cache_ttl: 1000 * 60 * 60,
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
     * Preforms BGG API collection call.
     *
     * @param {String} username
     *
     * @return {Promise<JSON>}
     */
    bggCollection: async function(username) {
        const
            cache_type = 'bgg_collection',
            cache = await this.cacheGet(cache_type, username);

        if(cache !== false) {
            return Promise.resolve(cache);
        }

        const
            params = {
                username: username
            },
            bgg = require('bgg')({
                toJSONConfig: {
                    object: true,
                    sanitize: false
                }
            });

        return bgg('collection', params).then(
           result => {
                //First time collection requests return 202 where it builds results and you try again later.
                if(result.hasOwnProperty('message')) {
                    throw 'Building results';
                }
                else {
                    this.cacheSet(cache_type, username, result);
                    return result;
                }
            }
        );
    },
    /**
     * Create Discord Embed from BGG collection
     *
     * @param {Object} result
     * @param {string} username
     * @return {module:"discord.js".MessageEmbed}
     */
    collectionToEmbed: function(result, username) {
        const Discord = require('discord.js');

        let collection_url = `https://boardgamegeek.com/collection/user/${username}`;
        let
            owned = 0,
            for_trade = 0,
            want_to_buy = 0,
            want_to_play = 0;

        result.items.item.forEach(item => {
            if(item.status.own) {
                owned++;
            }

            if(item.status.fortrade) {
                for_trade++;
            }

            if(item.status.wanttoplay) {
                want_to_play++;
            }

            if(item.status.wanttobuy) {
                want_to_buy++;
            }
        });

        return new Discord.MessageEmbed()
            .setColor('#3f3a60')
            .setTitle(username + '\'s collection')
            .setURL(collection_url)
            .setDescription(collection_url)
            .addFields(
                {
                    name: 'Total',
                    value: result.items.totalitems,
                    inline: true
                },
                {
                    name: 'Owned',
                    value: owned,
                    inline: true
                },
                {
                    name: 'For Trade',
                    value: for_trade,
                    inline: true
                },
                {
                    name: 'Want To Play',
                    value: want_to_play,
                    inline: true
                },
                {
                    name: 'Want to Buy',
                    value: want_to_buy,
                    inline: true
                }
            )
    },
    /**
     * Send collection embed to channel
     *
     * @param {Object} result
     * @param {module:"discord.js".Message} message
     * @param {String} username
     */
    collectionPrintEmbed: function(result, message, username) {
        if(typeof result === 'object') {
            message.channel.send(this.collectionToEmbed(result, username));
        }
        else {
            message.channel.send(`No results found for "${username}".`);
        }
    },
    /**
     * Execute Discord Command
     *
     * @param {module:"discord.js".Message} message
     * @param {Array} args
     * @return {Promise<void>}
     */
    execute: async function (message, args) {
        let current = this;
        let username = args[0].toLowerCase();

        current.bggCollection(username)
            .then(result => {
                console.log(`Collection results found for ${username}`);
                current.collectionPrintEmbed(result, message, username)
            })
            .catch(async function(err) {
                if(err === 'Building results') {
                    console.log(`Building collection results for ${username}`);

                    //Wait 2 seconds and then attempt call again. If it's still not ready
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    current.bggCollection(username)
                        .then(result => {
                            console.log(`Collection results found for ${username}`);
                            current.collectionPrintEmbed(result, message, username)
                        });
                }
                else {
                    throw err;
                }
            });
    },
}