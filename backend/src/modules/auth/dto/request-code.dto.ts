import { IsPhoneNumber } from 'class-validator';

export class RequestCodeDto {
  /** IsPhoneNumber(undefined) проверяет реальную корректность номера (код страны +
   * длина/структура национального номера по libphonenumber-js), а не только формат E.164. */
  @IsPhoneNumber(undefined, { message: 'Некорректный номер телефона' })
  phone!: string;
}
