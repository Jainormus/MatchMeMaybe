const AWS = require('aws-sdk');
const ssm = new AWS.SSM({ region: 'us-west-2' });

exports.handler = async (event) => {
    try {
        console.log("Starting Lambda execution");
        
        // Parameters for the SSM command
        const params = {
            DocumentName: 'AWS-RunShellScript',
            InstanceIds: ['i-0aa2fe864a3893cb8'],
            Parameters: {
                'commands': [
                    'cd /home/ec2-user/python || echo "Failed to change directory"',
                    'python3 -u scrape_jobs.py'
                ]
            }
        };

        console.log("Sending command to SSM");
        
        // Send command to EC2 instance
        const command = await ssm.sendCommand(params).promise();
        console.log("Command sent successfully:", command.Command.CommandId);
        
        // Wait for command to complete
        const commandId = command.Command.CommandId;
        
        // Poll for command completion
        let commandStatus;
        let pollCount = 0;
        const maxPolls = 100; // Prevent infinite loop
        
        do {
            pollCount++;
            console.log(`Polling command status (${pollCount}/${maxPolls})`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between checks
            
            try {
                const result = await ssm.getCommandInvocation({
                    CommandId: commandId,
                    InstanceId: 'i-0aa2fe864a3893cb8'
                }).promise();
                
                commandStatus = result.Status;
                console.log(`Command status: ${commandStatus}`);
                
                if (result.StandardOutputContent) {
                    console.log("Full output:", result.StandardOutputContent);
                }
        
                if (result.StandardErrorContent) {
                    console.log("Full error:", result.StandardErrorContent);
                }
            } catch (pollError) {
                console.error("Error polling command status:", pollError);
                throw pollError;
            }
        } while ((commandStatus === 'InProgress' || commandStatus === 'Pending') && pollCount < maxPolls)

        if (pollCount >= maxPolls && (commandStatus === 'InProgress' || commandStatus === 'Pending')) {
            console.warn(`Command is still ${commandStatus} after ${maxPolls} polls — cancelling...`);
            await ssm.cancelCommand({ CommandId: commandId }).promise();
            throw new Error("Command timed out and was cancelled.");
        }

        // Get final command output
        console.log("Getting final command output");
        const finalResult = await ssm.getCommandInvocation({
            CommandId: commandId,
            InstanceId: 'i-0aa2fe864a3893cb8'
        }).promise();

        console.log("Command complete with status:", finalResult.Status);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Job scraping completed',
                commandId: commandId,
                status: finalResult.Status,
                output: finalResult.StandardOutputContent,
                error: finalResult.StandardErrorContent
            }, null, 2)
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error executing job scraping',
                error: error.message,
                stack: error.stack
            }, null, 2)
        };
    }
};