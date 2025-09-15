import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  UseGuards,
  Request,
  Ip,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserSettingsService } from './user-settings.service';
import {
  UpdateUserSettingsDto,
  ChangePasswordDto,
} from './dto/user-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('user-settings')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('user-settings')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user settings' })
  @ApiResponse({
    status: 200,
    description: 'User settings retrieved successfully',
  })
  async getUserSettings(@Request() req) {
    return this.userSettingsService.getUserSettings('default-user' // Default since auth disabled);
  }

  @Patch()
  @ApiOperation({ summary: 'Update user settings' })
  @ApiResponse({
    status: 200,
    description: 'User settings updated successfully',
  })
  async updateSettings(
    @Request() req,
    @Body() updateSettingsDto: UpdateUserSettingsDto,
  ) {
    return this.userSettingsService.updateUserSettings(
      'default-user' // Default since auth disabled,
      updateSettingsDto,
    );
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - password validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - current password incorrect',
  })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userSettingsService.changePassword(
      'default-user' // Default since auth disabled,
      changePasswordDto,
    );
  }

  @Get('export')
  @ApiOperation({ summary: 'Export user data (GDPR compliance)' })
  @ApiResponse({ status: 200, description: 'User data exported successfully' })
  async exportUserData(@Request() req) {
    return this.userSettingsService.exportUserData('default-user' // Default since auth disabled);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get account summary with data counts' })
  @ApiResponse({
    status: 200,
    description: 'Account summary retrieved successfully',
  })
  async getAccountSummary(@Request() req) {
    return this.userSettingsService.getAccountSummary('default-user' // Default since auth disabled);
  }

  @Delete('account')
  @ApiOperation({
    summary: 'Delete user account permanently',
    description: 'This action is irreversible and will delete all user data',
  })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - password incorrect',
  })
  async deleteAccount(@Request() req, @Body() body: { password: string }) {
    return this.userSettingsService.deleteUserAccount(
      'default-user' // Default since auth disabled,
      body.password,
    );
  }
}
