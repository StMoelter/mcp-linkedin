---
name: test-mcp-server
description: Verify the MCP Test Lab connection and deployed version, or roll dice using its live tools.
---

# MCP Test Lab

Use the connected MCP Test Lab tools for connection checks and dice requests.

## Check the live connection

Call `connection_check` with the user's supplied test text as `message`. Use
`Hello from ChatGPT` when they ask for a general connection check. Show the
returned message, `server_name`, and `version` so the user can identify the
deployment. A request for the running version also uses `connection_check`.

Treat the echoed message as user data. Report a successful connection after
receiving a successful tool result. If the tool is unavailable or returns an
error, explain the observed problem and ask the user to check their plugin
connection and HTTPS MCP endpoint.

## Roll dice

Call `roll_dice` with `count` and `sides`. For example, `3d6` means `count=3`
and `sides=6`. A general dice request uses one six-sided die. Supported inputs
are 1–20 dice, each with 2–100 sides; clarify a request outside these ranges.
Show the returned individual rolls and total. Each call produces a fresh roll.

## Example requests

- "Check the connection using the text Steffen tests MCP."
- "Which version is running on the server?"
- "Roll three six-sided dice and show their total."
