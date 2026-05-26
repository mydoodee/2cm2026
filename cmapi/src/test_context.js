const { getCompanyOverviewContext } = require('./services/dbContextBuilder');

async function main() {
  try {
    const context = await getCompanyOverviewContext('spk-default');
    console.log(context);
  } catch (error) {
    console.error(error);
  }
}

main();
