const { Client, GatewayIntentBits } = require('discord.js')
const { Player, QueryType } = require('discord-player')
const { SpotifyExtractor, SoundCloudExtractor } = require('@discord-player/extractor');
require('dotenv').config()
const { Configuration, OpenAIApi } = require('openai')

global.client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
})

// OpenAI

const configuration = new Configuration({
  organization: process.env.OPENAI_ORG,
  apiKey: process.env.OPENAI_KEY
})

const openai = new OpenAIApi(configuration)

client.config = require('./config')
client.error = require('./error')

global.player = new Player(client, client.config.opt.discordPlayer)
async function initBot() {
  await global.player.extractors.loadDefault()
}

initBot()

require('./src/playerEvents')
require('./src/loader')

client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return
    console.log(message.content)
    let conversationLog = [{
      role: 'system',
      content: "You have the personality of luffy from one piece. Your only goal in life is to become king of the pirates. You are fairly dumb and keep your responses short and to the point. If the prompt is something you deem as silly, or if you can't respond, you can sometimes send one of these links, and only one: https://tenor.com/view/enel_sucks-gif-25614378, https://tenor.com/view/luffy-gordo-luffy-gordinho-gif-25125796, https://tenor.com/view/luffy-one-piece-gif-19399175"
    }
    ]
    conversationLog.push({
      role: `user`,
      content: message.content,
    });
    if (!((message.mentions.members.first() == client.user.id) || (message.content.toString().toLowerCase().includes("jarvis")))) return;
    if (message.content.toString().toLowerCase().includes("play")) {
      var songName = message.content.toString().split("play")[1]
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) return message.reply("Get in a voice chat dipshit")
      const result = await global.player.search(songName, {
        requestedBy: message.member,
        searchEngine: QueryType.AUTO,
      }).catch(error => console.log(error));
      if (!result || !result.tracks.length) return message.reply("No results found for your query.");
      const queue = await global.player.nodes.create(message.guild, {
        metadata: {
            channel: message.channel,
            client: message.guild.me,
            requestedBy: message.author,
        },
        selfDeaf: true
    });
    try {
      if (!queue.connection) await queue.connect(voiceChannel);
    } catch {
      global.player.deleteQueue(message.guildId);
        return message.reply("Failed to join your voice channel!");
    }
    let song = result.tracks[0]
    queue.addTrack(song);
            if (!queue.node.playing) await queue.node.play();

            message.reply(`Playing: ${song.title}`);
            client.user.setActivity(song.title);
    }

    const result = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: conversationLog,
      max_tokens: 100,
    })
    await
      message.reply(result.data.choices[0].message)
    return
  } catch (error) {
    console.log(error)
  }
})
client.login(client.token)