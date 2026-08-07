import { defaultTheme } from "@sveltepress/theme-default";
import { sveltepress } from "@sveltepress/vite";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [
        sveltepress({
            siteConfig: {
                description: "Event sourcing libraries for NestJS",
                title: "Event Nest"
            },
            theme: defaultTheme({
                github: "https://github.com/NickTsitlakidis/event-nest",
                navbar: [],
                sidebar: {}
            })
        })
    ]
});
