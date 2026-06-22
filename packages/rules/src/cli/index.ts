#!/usr/bin/env node
/**
 * CLI entry point for @aura/rules.
 *
 * Exposes the `aura-rules` binary with subcommands for fixture-based
 * rule testing.
 */

import { Command } from "commander";
import { testCommand } from "./commands/test.js";

const program = new Command();

program
  .name("aura-rules")
  .description("CLI for @aura/rules fixture-based testing")
  .version("0.0.0");

program.addCommand(testCommand);

program.parse();
