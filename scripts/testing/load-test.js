const autocannon = require('autocannon');
const { spawn } = require('child_process');

class LoadTester {
  constructor() {
    this.serverProcess = null;
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('npm', ['run', 'dev:backend'], {
        cwd: './backend',
        stdio: 'inherit'
      });

      // Wait for server to start
      setTimeout(resolve, 5000);
    });
  }

  stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }

  async runLoadTest() {
    console.log('🚀 Starting load tests...\n');

    const instance = autocannon({
      url: 'http://localhost:3001',
      connections: 100, // Number of concurrent connections
      duration: 30,     // Test duration in seconds
      requests: [
        {
          method: 'GET',
          path: '/health'
        },
        {
          method: 'POST',
          path: '/api/credentials/verify',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            credential: {
              type: 'test_credential',
              data: { test: 'value' }
            }
          })
        }
      ]
    }, this.printResults);

    autocannon.track(instance);

    process.once('SIGINT', () => {
      instance.stop();
      this.stopServer();
    });

    instance.on('done', () => {
      this.stopServer();
    });
  }

  printResults(err, result) {
    if (err) {
      console.error('Load test failed:', err);
      return;
    }

    console.log('\n📊 Load Test Results:');
    console.log('====================');
    console.log(`Requests: ${result.requests.total}`);
    console.log(`Duration: ${result.duration}s`);
    console.log(`Throughput: ${result.throughput} requests/second`);
    console.log(`Latency (avg): ${result.latency.average}ms`);
    console.log(`Errors: ${result.errors}`);
    console.log(`2xx Responses: ${result['2xx']}`);
    console.log(`Non-2xx Responses: ${result.non2xx}`);
  }

  async run() {
    try {
      await this.startServer();
      await this.runLoadTest();
    } catch (error) {
      console.error('Load test error:', error);
      this.stopServer();
    }
  }
}

// Run if this script is executed directly
if (require.main === module) {
  const tester = new LoadTester();
  tester.run();
}

module.exports = LoadTester;