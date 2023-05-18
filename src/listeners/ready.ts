import { Listener, SapphireClient } from "@sapphire/framework";
import { env, logger } from "../index.js";

export class ReadyListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      once: true,
      event: "ready",
    });
  }
  public async run(client: SapphireClient<true>) {
    logger.info("Bot is ready.");

    if (client.user.id !== env.clientId) {
      logger.warn(`User id does not match client id set in environment.`);
      logger.warn(`Expected: ${env.clientId}`);
    }

    logger.info(`Logged in as ${client.user?.tag} (${client.user?.id}).`);

    const guild = client.guilds.cache.get(env.guildId);
    if (guild) {
      logger.info(`Found main guild: ${guild.name} (${guild.id}).`);
      if (!guild.available) {
        logger.warn("Guild is not available. Many features may not work.");
      }
    } else {
      logger.warn(
        "Guild set in environment not found in cache. Not registering guild commands."
      );
    }

    logger.info("All startup tests done.");

    const channel = await guild?.channels.fetch("1005778779030966362");
    if (!channel?.isText()) return;

    // const channel = await guild?.channels.fetch("1005778779030966362");
    // if (!channel?.isText()) return;
    // channel.send({
    //   embeds: [
    //     new MessageEmbed()
    //       .setTitle("Channel Closed")
    //       .setDescription(
    //         "You're not timed out, __no one can talk here__. This channel is temporarily closed due to insufficient moderators that are suitable handling mature content. We get it: even though NSFW content is not allowed in BSR, we still have to enforce it since it's in an age-restricted channel.\nIn the meantime, you are welcome to talk in <#1005778558360223825> if you think the topic is suitable there. Thank you for your understanding!"
    //       )
    //       .setFooter({
    //         iconURL:
    //           "https://cdn.discordapp.com/emojis/869513411103424563.webp?size=2048&quality=lossless",
    //         text: "Authorised by BSR Administration",
    //       }),
    //   ],
    // });

    // await prisma.process.update({
    //   where: {
    //     type: "Development",
    //   },
    //   data: {
    //     roles: {
    //       admin: "983308639966208071",
    //       automation: "1005478995975995462",
    //       overseer: "983307596058460210",
    //       mod: "983306542088601620",
    //       contributor: "983306477232070676",
    //       angel: "983306358629744660",
    //       level75: "983306117910253578",
    //       level50: "983305851592933386",
    //       chillist: "983304895270633473",
    //       level25: "983304589837221920",
    //       level15: "983304235045228624",
    //       level10: "983303465033941032",
    //       level5: "983303233927794711",
    //       earlySupporter: "983302669391257600",
    //       rubRub: "1010180872802148434",
    //       rubyReds: "983309115436703774",
    //       dodgerBlues: "983310080994869278",
    //       ssAccess: "1005779141959876609",
    //       megaphoner: "1006888500274147330",
    //     },
    //   },
    // });

    // await prisma.process.update({
    //   where: {
    //     type: "Development",
    //   },
    //   data: {
    //     channels: {
    //       visitorCentre: {
    //         id: "1005463391311237220",
    //         channels: {
    //           welcome: "1005470506415308961",
    //           guidelines: "1005470556545618042",
    //           roles: "1005471593251745972",
    //           announcements: "1005471826983534602",
    //           monologue: "1005472092105482321",
    //           memories: "1005778053202460772",
    //         },
    //       },
    //       theSeashore: {
    //         id: "983301649806282793",
    //         channels: {
    //           general: "983301650305409055",
    //           submerged: "1005788765467443260",
    //           deepSea: "1005789133383405568",
    //           gaming: "1005474514307649606",
    //           techNScience: "1005474764619534447",
    //           creativity: "1005475317323939900",
    //           threadIt: "1005776315900764180",
    //           sunrise: "983301650305409056",
    //           voicelost: "1005790304512782458",
    //           submarine: "1005790791358234694",
    //           riverfest: "1005816960946278430",
    //         },
    //       },
    //       theSanctuary: {
    //         id: "1005481627373285396",
    //         channels: {
    //           sancResources: "1005777864328744981",
    //           sancForAll: "1005778558360223825",
    //           sancSensitive: "1005778779030966362",
    //           sancJournals: "1005781596667908148",
    //           sancRooms: "1005782036050620496",
    //         },
    //       },
    //       theHighway: {
    //         id: "1006883744768069702",
    //         channels: {
    //           botCommands: "1005481444526805012",
    //           unbelievaboat: "1008571286924042270",
    //           dankMemer: "1008571712163557436",
    //           knotBot: "1008571509037617264",
    //         },
    //       },
    //       outerSpace: {
    //         id: "1005477559070371931",
    //         channels: {
    //           staffUpdates: "1005479732273500210",
    //           internal: "1005478158692270080",
    //           threadMsgs: "1005791583154733147",
    //           admin: "1005480697630306375",
    //           overseer: "1005480515073212446",
    //           octochat: "1005480298093477898",
    //           staffCmds: "1005481338347978762",
    //         },
    //       },
    //       logging: {
    //         id: "1005478610469134478",
    //         channels: {
    //           modLog: "1010739845523574784",
    //         },
    //       },
    //     },
    //   },
    // });

    // await prisma.process.update({
    //   where: {
    //     type: "Development",
    //   },
    //   data: {
    //     guidelines: [
    //       {
    //         number: 1,
    //         title: "You're in a public space",
    //         description:
    //           "Please be mindful and civil to everyone around you. Be respectful and don't harass or discriminate others. Friendly banter and swearing is allowed to an extent. Keep drama away from BSR, not everyone likes them!",
    //       },
    //       {
    //         number: 2,
    //         title: "Don't be disruptive",
    //         description:
    //           "Spamming disrupts awesome conversations from happening! Message spamming or unsolicited self-promotion/advertisements is not allowed. Please note that we are unable to enforce guidelines in DMs, statuses or about me sections.",
    //       },
    //       {
    //         number: 3,
    //         title: "SFW content only",
    //         description:
    //           "We don't want to limit conversations, especially in the Sanctuary. However, to moderate efficiently NSFW (Not Safe for Work) content is not allowed anywhere. This includes in age-restricted labelled channels and in your Discord profile. Occasional NSFW jokes are allowed.",
    //       },
    //       {
    //         number: 4,
    //         title: "Only trusted links or files",
    //         description:
    //           "To prevent possible inappropriate content, members below Level 15 cannot send untrusted links or files. Images, videos, and sound files are allowed. However, embedded media links will be deleted if the author does not have Attach Files permission.",
    //       },
    //       {
    //         number: 5,
    //         title: "Don't get lost",
    //         description:
    //           "All the channels may be overwhelming at first, but please keep all content in the channel to its purpose. Use the appropriate channel, and if you get lost, ask for help!",
    //       },
    //       {
    //         number: 6,
    //         title: "Don't impersonate",
    //         description:
    //           "Don't intentionally impersonate anyone else by changing your global/server identity, regardless if they are in BSR. Joke impersonations are allowed, however, they must be made clear to others.",
    //       },
    //       {
    //         number: 7,
    //         title: "Easily mentionable names",
    //         description:
    //           "Your nickname (or username if none set) must contain at least 3 alphanumerical or special characters available on a standard QWERTY keyboard.",
    //       },
    //       {
    //         number: 8,
    //         title: "Keep private things private",
    //         description:
    //           "Please don't ask other members or release private, personal, or sensitive information of anyone, including yourself. Remind yourself of rule 1 - you're in a public space!",
    //       },
    //       {
    //         number: 9,
    //         title: "Make staff's lives easier",
    //         description:
    //           "Simply put, don't interfere or argue with staff members when they're doing their job. Don't intentionally mislead others when a serious question is asked, or provide fake or forged evidence to staff members. Loopholing doesn't help anyone either, so don't do it.",
    //       },
    //       {
    //         number: 10,
    //         title: "Follow Discord guidelines",
    //         description:
    //           "The internet is a wild place, let Discord help us to help you. Follow the Discord Terms of Service (https://dis.gd/terms) and Community Guidelines (https://dis.gd/guidelines) at all times. Offences will result in a ban and a report to Discord's T&S team.",
    //       },
    //     ],
    //   },
    // });
  }
}
