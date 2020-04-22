import { getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';

import TransactionRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionRepository = getCustomRepository(TransactionRepository);

    const trans = await transactionRepository.findOne(id);

    if (!trans) throw new AppError('Transaction not exist');

    await transactionRepository.remove(trans);
  }
}

export default DeleteTransactionService;
