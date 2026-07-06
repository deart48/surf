import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentClient } from '../../common/decorators/current-client.decorator';
import { IdempotencyKey } from '../../common/decorators/idempotency-key.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /** operationId: createBooking — POST /bookings (LOGIC-004: Idempotency-Key) */
  @Post()
  createBooking(
    @CurrentClient() clientId: string,
    @Body() dto: CreateBookingDto,
    @IdempotencyKey() idempotencyKey?: string,
  ) {
    return this.bookingsService.createBooking(clientId, dto, idempotencyKey);
  }

  /** operationId: listBookings — GET /bookings (только свои, NFR-8) */
  @Get()
  listBookings(
    @CurrentClient() clientId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.bookingsService.listBookings(clientId, Number(limit) || undefined, Number(offset) || undefined);
  }

  /** operationId: getBooking — GET /bookings/:bookingId (403 на чужую, NFR-8) */
  @Get(':bookingId')
  getBooking(@CurrentClient() clientId: string, @Param('bookingId') bookingId: string) {
    return this.bookingsService.getBooking(clientId, bookingId);
  }

  /** operationId: cancelBooking — POST /bookings/:bookingId/cancel (LOGIC-005) */
  @Post(':bookingId/cancel')
  cancelBooking(@CurrentClient() clientId: string, @Param('bookingId') bookingId: string) {
    return this.bookingsService.cancelBooking(clientId, bookingId);
  }
}
