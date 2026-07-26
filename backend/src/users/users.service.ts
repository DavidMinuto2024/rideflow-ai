import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseDataService } from '../supabase/supabase-data.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class UsersService {
  constructor(private readonly supabase: SupabaseDataService) {}

  async getProfile(userId: string) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select(
        '*, members:organization_members(*, organization:organizations(*)), vehicles:vehicles(*)',
      )
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('User not found');
      }
      this.supabase.handleError(error, 'users');
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Verify user exists
    const { data: existing, error: findError } = await this.supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (findError || !existing) {
      throw new NotFoundException('User not found');
    }

    const { data: updatedUser, error: updateError } = await this.supabase
      .from('users')
      .update(dto)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      this.supabase.handleError(updateError, 'users');
    }

    return updatedUser;
  }

  async updateRole(
    organizationId: string,
    userId: string,
    dto: UpdateRoleDto,
    requesterId: string,
  ) {
    // Verify requester has admin rights in this org
    const { data: requesterMember, error: requesterError } =
      await this.supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', requesterId)
        .single();

    if (requesterError) {
      if (requesterError.code === 'PGRST116') {
        throw new ForbiddenException('Only admins can change user roles');
      }
      this.supabase.handleError(requesterError, 'organization_members');
    }

    if (
      !requesterMember ||
      (requesterMember.role !== 'SUPER_ADMIN' &&
        requesterMember.role !== 'ORG_ADMIN')
    ) {
      throw new ForbiddenException('Only admins can change user roles');
    }

    // Find the target member
    const { data: targetMember, error: targetError } = await this.supabase
      .from('organization_members')
      .select('id, role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (targetError) {
      if (targetError.code === 'PGRST116') {
        throw new NotFoundException(
          'User is not a member of this organization',
        );
      }
      this.supabase.handleError(targetError, 'organization_members');
    }

    if (!targetMember) {
      throw new NotFoundException('User is not a member of this organization');
    }

    // Update the role
    const { data: updatedMember, error: updateError } = await this.supabase
      .from('organization_members')
      .update({ role: dto.role })
      .eq('id', targetMember.id)
      .select()
      .single();

    if (updateError) {
      this.supabase.handleError(updateError, 'organization_members');
    }

    return updatedMember;
  }
}
