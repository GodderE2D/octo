# Octo 🍋

Octo is a moderation and utilities Discord bot for Blue Shark River.

## Self-hosting

Unlike other open-source hosted Discord bots, we want to ensure self-hosting Octo is as easy as possible.

While Octo may not be the best fit for every server, we encourage you to try it out. While there are other bots specially made for self-hosting, Octo is a good starting point for many servers.

You don't need a huge amount of resources to host Octo. As it's a Discord bot and only running in a single server, you can host it in basically any VPS.

To self-host Octo, first download the latest release from GitHub.

```bash
git clone https://github.com/GodderE2D/octo.git && cd octo
```

Then, install all the necessary dependencies through Yarn v3. [Don't have Yarn installed?](https://yarnpkg.com/getting-started/install)

```bash
yarn
```

Octo uses PostgreSQL with Prisma as its primary database. Thus, you need a Postgres database to run Octo. To run a Postgres database locally, you can follow [the official manual](https://www.postgresql.org/docs/current/tutorial-install.html).

Once you have Postgres installed, copy the `.env.example` file to a new `.env` file and fill out your environment variables.

```bash
cp .env.example .env
```

After you filled out the `.env` file, push the Prisma schema to your database.

```bash
yarn prisma push
```

Finally, run the bot in development mode. It may take a few seconds to initially start up.

```bash
yarn dev
```

If you would like to run the bot in production mode, ensure that all environment variables that are required in production is filled out. Then, run the bot.

```bash
yarn start
```
