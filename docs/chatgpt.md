# Try MCP Test Lab in ChatGPT

## Deploy and inspect the server

Deploy a [published image](deployment.md#deploy-a-published-image) behind your
HTTPS reverse proxy. The public MCP URL includes the `/mcp` path, for example
`https://mcp.example.com/mcp`. Both demo tools accept anonymous calls.

Check the deployed HTTP and MCP behavior:

```sh
python3 scripts/smoke_test.py https://mcp.example.com 0.1.0
```

The smoke test checks health, initialization, tool discovery, the connection
check, and a dice roll. The reverse proxy forwards `/health` for this combined
check. You can also inspect and call the tools using MCP Inspector:

```sh
npx @modelcontextprotocol/inspector@latest
```

Select Streamable HTTP and connect to your HTTPS `/mcp` endpoint. Inspect
`connection_check` and `roll_dice`, including their inputs and structured results.

## Connect ChatGPT

1. Open ChatGPT settings and enable Developer mode under Security and login.
2. Open Plugins, select the plus button, and create a connection named
   **MCP Test Lab** with your full HTTPS `/mcp` URL and anonymous authentication.
3. Open a new chat and select the plugin from the composer menu.
4. Ask: "Check the MCP connection with the text Steffen tests MCP."
5. Confirm that the tool response echoes the text, identifies `mcp-linkedin`,
   and reports the version you deployed.
6. Ask: "Roll three six-sided dice and show the individual values and total."
7. Inspect the tool call and compare its individual rolls with the displayed sum.

Developer mode availability follows your account and workspace configuration.
After a server update, refresh its discovered tools in the plugin settings and
repeat the connection check to confirm the deployed version.

## Add the companion skill

The release includes `test-mcp-server-<version>.zip`, containing the portable
`test-mcp-server/SKILL.md`. The same source lives in
[skills/test-mcp-server/SKILL.md](../skills/test-mcp-server/SKILL.md).

Add that skill to the plugin connected to your server. For a plugin package,
place it at `skills/test-mcp-server/SKILL.md` inside the package. The skill guides
connection checks, version requests, and dice notation such as `3d6`.

Try these prompts with the plugin enabled:

- "Which version is running on the server?"
- "Check the connection with the message Release 0.1.0 is live."
- "Roll 3d6 and show the total."

## Connection troubleshooting

Verify the HTTPS endpoint and certificate from outside the hosting network.
Check the proxy's forwarding of MCP methods, headers, and response bodies. Use
MCP Inspector to compare tool discovery and calls with the ChatGPT connection.
The published container logs and `/health` endpoint support deployment diagnosis.

## References

- [OpenAI: Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [OpenAI: Plugin quickstart](https://developers.openai.com/plugins/quickstart)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
