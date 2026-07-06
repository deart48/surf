import { IsPhoneNumber, Matches } from 'class-validator';

const OTP_PATTERN = /^\d{4}$/;

export class VerifyCodeDto {
  /** IsPhoneNumber(undefined) проверяет реальную корректность номера (код страны +
   * длина/структура национального номера по libphonenumber-js), а не только формат E.164. */
  @IsPhoneNumber(undefined, { message: 'Некорректный номер телефона' })
  phone!: string;

  @Matches(OTP_PATTERN, { message: 'code должен состоять из 4 цифр' })
  code!: string;
}
