require('dotenv').config();

const
    fs = require('fs'),
    Discord = require('discord.js'),
    { Intents } = Discord,
    prefix = '!',
    token = process.env.TOKEN,
    client = new Discord.Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
        ]
    });

client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);

    // set a new item in the Collection
    // with the key as the command name and the value as the exported module
    client.commands.set(command.name, command);
}

client.on('ready', () => {
    client.user.setActivity('!bgg', {type: 'LISTENING'});
});

client.on('messageCreate',  message => handleMessage(message));

client.login(token);

/**
 *
 * @param {module:"discord.js".Message} message
 */
function handleMessage(message) {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    let parsedMessage = parseMessage(message);

    const
        args = parsedMessage.args,
        commandName = parsedMessage.commandName,
        commandOptions = parsedMessage.commandOptions;

    if (!client.commands.has(commandName)) return;

    const command = client.commands.get(commandName);

    if (command.args && !args.length) {
        let reply = `You didn't provide any arguments, ${message.author}!`;

        if (command.usage) {
            reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
        }

        return message.channel.send(reply);
    }

    command
        .execute(message, args, commandOptions)
        .catch(async function (error){
            console.error(error);
            await message.reply('there was an error trying to execute that command!');
        });
}

function parseMessage(message) {
    let
        args = message.content.slice(prefix.length).split(/ +/),
        commandName = args.shift().toLowerCase(),
        commandOptions = {};

    if (commandName === 'bgg') {

        if (args.length > 0) {

            if (args[0] === 'suggest') {
                args[0] = 'search';
                commandOptions.type = 'suggest';
            }
            else if (args[0] === 'search') {
                commandOptions.type = 'search';
            }

            commandName = commandName + '-' + args[0];
            args.shift();
        }
        else {
            commandName = commandName + '-help';
        }
    }

    return {
        'args': args,
        'commandName': commandName,
        'commandOptions': commandOptions
    }
}
