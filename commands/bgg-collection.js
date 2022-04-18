const xml2js = require("xml2js");
module.exports = {
    name: 'bgg-collection',
    description: 'Search Boardgamegeek for collection info. Args: <username>',
    usage: '<username>',
    args: true,
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
            keyv = new Keyv(process.env.REDIS_URL);

        keyv.on('error', err => {
            console.log('Connection Error', err);
        });

        cache_key = cache_type + '_' + cache_key;
        let cache = await keyv.get(cache_key);

        keyv.opts.store.redis.disconnect();

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
            keyv = new Keyv(process.env.REDIS_URL);

        cache_key = cache_type + '_' + cache_key;
        await keyv.set(cache_key, cache_data, this.cache_ttl);

        keyv.opts.store.redis.disconnect();
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
            cache = await this.cacheGet(cache_type, username),
            fetch = require('node-fetch'),
            xml2js = require('xml2js'),
            parser = new xml2js.Parser();

        if(cache !== false) {
            return Promise.resolve(cache);
        }

        return fetch('https://boardgamegeek.com/xmlapi2/collection?username='+username).then(async response => {
                //First time collection requests return 202 where it builds results and you try again later.
                if(response.status === 202) {
                    throw 'Building results';
                }
                else {
                    const content = await response.text();
                    const result = await parser.parseStringPromise(content);
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
            const itemStatus = item.status[0]['$'];

            if(itemStatus.own === '1') {
                owned++;
            }

            if(itemStatus.fortrade === '1') {
                for_trade++;
            }

            if(itemStatus.wanttoplay === '1') {
                want_to_play++;
            }

            if(itemStatus.wanttobuy === '1') {
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
                    value: result.items['$'].totalitems,
                    inline: true
                },
                {
                    name: 'Owned',
                    value: `${owned}`,
                    inline: true
                },
                {
                    name: 'For Trade',
                    value: `${for_trade}`,
                    inline: true
                },
                {
                    name: 'Want To Play',
                    value: `${want_to_play}`,
                    inline: true
                },
                {
                    name: 'Want to Buy',
                    value: `${want_to_buy}`,
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
        if(typeof result === 'object' && result.items['$'].totalitems > 0) {
            message.channel.send({ embeds: [this.collectionToEmbed(result, username)] });
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
     * @param {Object} commandOptions
     * @return {Promise<void>}
     */
    execute: async function (message, args, commandOptions) {
        let current = this;
        let username = args[0].toLowerCase();

        current.bggCollection(username)
            .then(result => {
                console.log(`Collection results found for ${username}`);
                message.delete();
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