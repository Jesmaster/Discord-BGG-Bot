const {SlashCommandBuilder} = require("@discordjs/builders");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('collection')
        .setDescription('Search Boardgamegeek for collection info. Args: <username>')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The username for the BGG collection')
                .setRequired(true)
        ),
    cache_ttl: 1000 * 60 * 60,
    /**
     * Pull from BGG Bot Cache
     *
     * @param {string} cache_type
     * @param {string} cache_key
     * @return {Promise<JSON|boolean>}
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
     * @throws {string}
     * @return {Promise<JSON>}
     */
    bggCollection: async function(username) {
        const
            cache_type = 'bgg_collection',
            cache = await this.cacheGet(cache_type, username),
            axios = require('axios'),
            xml2js = require('xml2js'),
            parser = new xml2js.Parser();

        if(cache !== false) {
            return cache;
        }

        const response = await axios('https://boardgamegeek.com/xmlapi2/collection?username='+encodeURI(username));

        //First time collection requests return 202 where it builds results and you try again later.
        if(response.status === 202) {
            return 'Building results';
        }
        else {
            const { data } = response;
            const result = await parser.parseStringPromise(data);
            await this.cacheSet(cache_type, username, result);

            return result;
        }
    },
    /**
     * Create Discord Embed from BGG collection
     * 
     * @param {Object} results
     * @param {string} username
     * @param {User} user
     * @return {import("discord.js").EmbedBuilder}
     */
    collectionToEmbed: function(result, username, user) {
        const { EmbedBuilder, User } = require('discord.js');

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

        return new EmbedBuilder()
            .setColor('#3f3a60')
            .setTitle(username + '\'s collection')
            .setURL(collection_url)
            .setDescription(collection_url)
            .setAuthor({ name: user.username, url: user.avatarURL(), iconURL: user.displayAvatarURL() })
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
     * @param {import("discord.js").Interaction} interaction
     * @param {string} username
     */
    collectionPrintEmbed: function(result, interaction, username) {
        const isObject = typeof result === 'object';
        const hasErrors = result?.errors?.error?.length > 0;

        if (hasErrors) {
            console.log(new Date().toISOString(), JSON.stringify(result.errors.error));
        }

        if (isObject && !hasErrors && result.items['$'].totalitems > 0) {
            interaction.editReply({ embeds: [this.collectionToEmbed(result, username, interaction.member.user)] });
        }
        else {
            interaction.editReply(`No results found for "${username}".`);
        }
    },
    /**
     * Execute Discord Command
     * @param {import("discord.js").Interaction} interaction
     * @return {Promise<void>}
     */
    execute: async function (interaction) {
        await interaction.deferReply();
        const username = interaction.options.getString('username');
        
        let result = await this.bggCollection(username);
        if (result === 'Building results') {
            console.log(new Date().toISOString(), `Building collection results for ${username}`);

            //Wait 2 seconds and then attempt call again.
            await new Promise((resolve) => setTimeout(resolve, 2000));
            result = await this.bggCollection(username);
        }

        console.log(new Date().toISOString(), `Collection results found for ${username}`);
        this.collectionPrintEmbed(result, interaction, username);
    },
}