import { faker } from '@faker-js/faker';

export interface StockQuote {
  price: number;
  volume: number;
  bid: number;
  ask: number;
  exchange: string;
}

export function get_stock_quote(symbol: string): StockQuote {
  const price = parseFloat(faker.finance.amount({ min: 100, max: 300, dec: 2 }));
  const volume = faker.number.int({ min: 100000, max: 10000000 });
  const bid = parseFloat((price * 0.995).toFixed(2));
  const ask = parseFloat((price * 1.005).toFixed(2));
  const exchange = faker.helpers.arrayElement(['NASDAQ', 'NYSE']);

  console.log(`[get_stock_quote] Faked data for ${symbol}: Price=${price}, Volume=${volume}`);

  return {
    price,
    volume,
    bid,
    ask,
    exchange,
  };
}
