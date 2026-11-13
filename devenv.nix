{
  pkgs,
  lib,
  config,
  inputs,
  ...
}:

{
  # https://devenv.sh/packages/
  packages = [ pkgs.git ];

  # https://devenv.sh/languages/
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    npm.enable = true;
  };
  languages.typescript.enable = true;

  # https://devenv.sh/processes/
  processes.dev.exec = "npm run dev";

  # https://devenv.sh/scripts/
  scripts = {
    dev.exec = "npm run dev";
    build.exec = "npm run build";
    lint.exec = "npm run lint -- src";
    test.exec = "npm test -- --run";
  };

  # https://devenv.sh/basics/
  enterShell = ''
    node --version
  '';

  # https://devenv.sh/tests/
  enterTest = ''
    echo "Running lint, unit tests, and build"
    npm run lint -- src
    npm test -- --run
    npm run build
  '';

  # See full reference at https://devenv.sh/reference/options/
}
