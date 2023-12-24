const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Get help for bgg bot commands"),
  /**
   * Create Discord Embed for help
   *
   * @return {module:"discord.js".EmbedBuilder}
   */
  helpEmbed: (client) => {
    const { EmbedBuilder } = require("discord.js");

    return new EmbedBuilder()
      .setColor("#3f3a60")
      .setTitle("BGG Bot Commands")
      .addFields(
        {
          name: "Stats",
          value: "BGG Bot is on " + client.guilds.cache.size + " servers",
        },
        {
          name: "Collection",
          value:
            "Get collection information for a bgg user.\nUsage: `/collection <bgg_username>`.",
        },
        {
          name: "Search",
          value:
            "Get information for a board game from bgg.\nUsage: `/search <game_name>` and leave the extra option blank",
        },
        {
          name: "Suggest",
          value:
            'Get information for a board game from bgg and allow emjoi reactions for people looking to play.\nUsage: type `/search <game_name>` and tab to option "Suggest to play a game.".',
        },
      );
  },
  /**
   * Execute Discord Command
   *
   * @param {module:"discord.js".Interaction} interaction
   * @return {Promise<void>}
   */
  execute: async function (interaction) {
    const { client } = interaction;

    await interaction.reply({ embeds: [this.helpEmbed(client)] });
  },
};

