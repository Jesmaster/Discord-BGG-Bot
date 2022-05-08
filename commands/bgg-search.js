const {SlashCommandBuilder} = require("@discordjs/builders");
const he = require("he");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search Boardgamegeek for game info. Args: <game_name>')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the game you want to search for.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('suggest')
                .setDescription('Suggest to play this game?')
                .addChoices({
                    name: 'Suggest to play a game.',
                    value: 'suggest',
                })
        ),
    cache_ttl: 1000 * 60 * 60 * 24,
    /**
     * Preforms BGG API search call.
     * @return {Promise<JSON>}
     */
    bggSearch: async function(name) {
        const
            searchParams = new URLSearchParams(JSON.stringify({query: name})),
            query = searchParams.toString(),
            cache_type = 'bgg_search',
            cache = await this.cacheGet(cache_type, query),
            fetch = require('node-fetch');

        if(cache !== false) {
            return Promise.resolve(cache);
        }

        return fetch('https://boardgamegeek.com/search/boardgame?q='+name, {
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
            cache = await this.cacheGet(cache_type, thing_id),
            fetch = require('node-fetch'),
            xml2js = require('xml2js'),
            parser = new xml2js.Parser();

        if(cache !== false) {
            return Promise.resolve(cache);
        }

        return fetch('https://boardgamegeek.com/xmlapi2/thing?id='+thing_id).then(async response => {
            const content = await response.text();
            const result = await parser.parseStringPromise(content);
            this.cacheSet(cache_type, thing_id, result);
            return result;
        });
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
            .setTitle(item.name instanceof Array ? item.name[0]['$'].value : item.name['$'].value)
            .setURL(`https://boardgamegeek.com/${item['$'].type}/${item['$'].id}`)
            .setThumbnail(item.thumbnail[0])
            .setDescription(he.decode(item.description[0]).substr(0, 200)+'...')
            .setAuthor({ name: user.username, url: user.avatarURL(), iconURL: user.displayAvatarURL() })
            .addFields(
                {
                    name: ':hash: Number of Players',
                    value: `${item.minplayers[0]['$'].value} - ${item.maxplayers[0]['$'].value}`,
                    inline: true
                },
                {
                    name: ':hourglass: Average Playtime',
                    value: `${item.playingtime[0]['$'].value} min`,
                    inline: true
                },
            );
    },
    /**
     * Send game embed to channel given thing_id
     */
    thingIdToSearchEmbed: async function(bggSearchResult, interaction) {
        if(bggSearchResult.found) {
            const result = await this.bggThing(bggSearchResult.thing_id);
            await interaction.reply({
                embeds: [this.itemToSearchEmbed(result.items.item[0],  interaction.member.user)]
            });
        }
        else {
            await interaction.reply(`No results found for "${interaction.options.getString('name')}".`);
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
            .setTitle(item.name instanceof Array ? item.name[0]['$'].value : item.name['$'].value)
            .setURL(`https://boardgamegeek.com/${item['$'].type}/${item['$'].id}`)
            .setThumbnail(item.thumbnail[0])
            .setDescription(he.decode(item.description[0]).substr(0, 200)+'...')
            .setFooter({ text: '( 👍 Interested | 📖 Can Teach | ❌ End Suggestion )'})
            .setAuthor({ name: user.username, url: user.avatarURL(), iconURL: user.displayAvatarURL() })
            .addFields(
                {
                    name: ':hash: Number of Players',
                    value: `${item.minplayers[0]['$'].value} - ${item.maxplayers[0]['$'].value}`,
                    inline: true
                },
                {
                    name: ':hourglass: Average Playtime',
                    value: `${item.playingtime[0]['$'].value} min`,
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
     */
    thingIdToSuggestEmbed: async function(bggSearchResult, interaction) {
        const Discord = require('discord.js');

        if(bggSearchResult.found) {
            this.bggThing(bggSearchResult.thing_id)
                .then(result => {
                    let embed = this.itemToSuggestEmbed(result.items.item[0], interaction.member.user);
                    interaction.reply({ embeds: [embed], fetchReply: true }).then(embedMessage => {
                        embedMessage.react("👍");
                        embedMessage.react("📖");
                        embedMessage.react("❌");

                        const blank_char = '\u200B';
                        const time = 1000 * 60 * 60 * 24 * 7;
                        const filter = (reaction, user) => {
                            return ['👍', "📖"].includes(reaction.emoji.name) && !user.bot;
                        };
                        const collector = embedMessage.createReactionCollector({ filter, dispose: true, idle: time });

                        collector
                            .on('collect', (reaction, user) => {
                                let changedEmbed = new Discord.MessageEmbed(embed);
                                let username = `<@${user.id}>\n${blank_char}`;
                                let field_delta = 3;

                                if (reaction.emoji.name === "📖") {
                                    field_delta = 4;
                                }

                                if (changedEmbed.fields[field_delta].value === blank_char) {
                                    changedEmbed.fields[field_delta].value = username;
                                }
                                else {
                                    changedEmbed.fields[field_delta].value += username;
                                }
                                embedMessage.edit({ embeds: [changedEmbed] });

                                embed = changedEmbed;
                        })
                            .on('remove', (reaction, user) => {
                                let changedEmbed = new Discord.MessageEmbed(embed);
                                let username = `<@${user.id}>\n${blank_char}`;
                                let field_delta = 3;

                                if (reaction.emoji.name === "📖") {
                                    field_delta = 4;
                                }

                                changedEmbed.fields[field_delta].value = changedEmbed.fields[field_delta].value.replace(username, '');

                                if (changedEmbed.fields[field_delta].value === '') {
                                    changedEmbed.fields[field_delta].value = blank_char;
                                }

                                embedMessage.edit({ embeds: [changedEmbed] });

                                embed = changedEmbed;
                        })
                            .on('end', collected => {
                                deleteCollector.stop();
                                embedMessage.reactions.removeAll();
                                let changedEmbed = new Discord.MessageEmbed(embed);
                                embed.setFooter({ text: 'Reactions have been closed off for this suggestion.' });
                                embedMessage.edit({ embeds: [embed] });
                            });

                        const deleteFilter = (reaction, user) => {
                            return reaction.emoji.name == '❌' && user.id === interaction.member.user.id;
                        };
                        const deleteCollector = embedMessage.createReactionCollector({ filter: deleteFilter });
                        deleteCollector.on('collect', () => {
                            collector.stop();
                            deleteCollector.stop();
                        });

                    }).catch(err => console.error(err));
                });
        }
        else {
            await interaction.reply(`No results found for "${interaction.options.getString('name')}".`);
        }
    },
    /**
     * Execute Discord Command
     * @return {Promise<void>}
     */
    execute: async function(interaction) {
        const name = interaction.options.getString('name');
        const suggest = interaction.options.getString('suggest');

        this.bggSearch(name)
            .then(result => this.thingIdFromBggSearchCall(result))
            .then(bggSearchResult => {
                if (suggest === 'suggest') {
                    this.thingIdToSuggestEmbed(bggSearchResult, interaction);
                }
                else {
                    this.thingIdToSearchEmbed(bggSearchResult, interaction);
                }
            })
    },
};