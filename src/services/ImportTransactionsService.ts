import { getCustomRepository, getRepository, In } from 'typeorm';
import fs from 'fs';
import csvParse from 'csv-parse';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface CSV {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const read = fs.createReadStream(filePath);

    const parse = csvParse({ from_line: 2 });

    const parseCsv = read.pipe(parse);

    const transaction: CSV[] = [];
    const categories: string[] = [];

    parseCsv.on('data', async line => {
      const [title, type, value, category] = line.map((column: string) =>
        column.trim(),
      );

      if (!title || !type || !value) return false;

      categories.push(category);

      transaction.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCsv.on('end', resolve));

    const categoryExist = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = categoryExist.map(
      (category: Category) => category.title,
    );

    const addCategories = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, i, self) => self.indexOf(value) === i);

    const newCategories = categoriesRepository.create(
      addCategories.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);

    const categoriesFinal = [...newCategories, ...categoryExist];

    const createdTransactions = transactionRepository.create(
      transaction.map(trans => ({
        title: trans.title,
        type: trans.type,
        value: trans.value,
        category: categoriesFinal.find(
          category => category.title === trans.category,
        ),
      })),
    );

    await transactionRepository.save(createdTransactions);

    await fs.promises.unlink(filePath);
    return createdTransactions;
  }
}

export default ImportTransactionsService;
