import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class PushTokenDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsIn(['web', 'ios', 'android'])
  platform!: 'web' | 'ios' | 'android';
}
