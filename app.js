'use strict';

const os = require('os');
const inquirer = require('inquirer');
const {exec} = require('child_process');

const chalkPipe = require('chalk-pipe');
const warning = chalkPipe('orange');

const fs = require('fs');
const path = require('path');
const baseConfigFilePath = fs.readFileSync(path.resolve(__dirname, './config.json'));
const configFilePath = path.resolve(`${os.homedir()}/.k4-commit.config`);

if (!fs.existsSync(configFilePath)) {
    fs.writeFileSync(configFilePath, baseConfigFilePath);
}

const configFile = fs.readFileSync(configFilePath);
const config = JSON.parse(configFile);

inquirer
    .prompt([
        {
            type: 'list',
            name: 'type',
            message: 'Issue Type \t: ',
            choices: config.issueTypes,
            filter: function (value) {
                return value.toLowerCase();
            }
        },
        {
            type: 'input',
            message: 'Issue Key \t: ',
            name: 'key',
            default: config.lastIssueKey,
            validate: function (value) {
                const validate = value.match('([A-z]+-[0-9]+)|(^[0-9]+)');
                if (validate) {
                    return true;
                }
                return 'Please enter a valid issue key';
            },
            filter: function (value) {
                if (parseInt(value)) {
                    value = `${config.preIssueKey}-${value}`
                }
                return value.toLowerCase();
            }
        },
        {
            type: 'checkbox',
            message: 'Contributors \t: ',
            name: 'contributors',
            default: 2,
            choices: config.contributors,
            validate: function (value) {
                if (value.length < 1) {
                    return 'You must choose at least one contributor.';
                }
                return true;
            },
        },
        {
            type: 'input',
            message: 'Message \t: ',
            name: 'message',
            validate: function (value) {
                if (value.length < config.msgCharCount.min) {
                    return 'Please describe the change you made.';
                }
                if (value.length > config.msgCharCount.max) {
                    return 'Message is too long.'
                }
                return true;
            },
        },
    ])
    .then(answers => {
        config.lastIssueKey = answers.key;
        const commitMessage = `[${answers.type}][${answers.key}][${answers.contributors.join('/')}] ${answers.message}`
        console.log(warning(`\n ${commitMessage}\n`));
        return commitMessage
    })
    .then(commitMessage => {
        inquirer.prompt({
            type: 'confirm',
            name: 'confirm',
            prefix: '',
            message: 'Commit the changes? ',
            default: true,
        }).then(answer => {
            if (answer.confirm) {
                const data = JSON.stringify(config);
                fs.writeFileSync(configFilePath, data);
                exec(`git commit -m "${commitMessage}"`, (error, stdout, stderr) => {
                    if (error) {
                        console.log(error.message);
                        return;
                    }
                    if (stderr) {
                        console.log(stderr);
                        return;
                    }
                    console.log(stdout);
                });
            }
        })
    });
