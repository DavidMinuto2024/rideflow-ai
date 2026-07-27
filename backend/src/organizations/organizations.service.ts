import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseDataService } from '../supabase/supabase-data.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly supabase: SupabaseDataService) {}

  async create(dto: CreateOrganizationDto, userId: string) {
    // Check slug uniqueness
    const { data: existing, error: checkError } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('slug', dto.slug)
      .maybeSingle();

    if (checkError) this.supabase.handleError(checkError, 'organizations');
    if (existing) {
      throw new ConflictException(`Organization with slug "${dto.slug}" already exists`);
    }

    // Create org
    const { data: organization, error: orgError } = await this.supabase
      .from('organizations')
      .insert({
        id: crypto.randomUUID(),
        name: dto.name,
        slug: dto.slug,
        logo: dto.logo,
      })
      .select()
      .single();

    if (orgError) {
      // Handle unique constraint violation on slug (race condition)
      if (orgError.code === '23505') {
        throw new ConflictException(`Organization with slug "${dto.slug}" already exists`);
      }
      this.supabase.handleError(orgError, 'organizations');
    }

    // Automatically add creator as ORG_ADMIN
    const { error: memberError } = await this.supabase
      .from('organization_members')
      .insert({
        id: crypto.randomUUID(),
        role: 'ORG_ADMIN',
        organization_id: organization!.id,
        user_id: userId,
      });

    if (memberError) {
      // Rollback: delete the created org if member creation fails
      await this.supabase.from('organizations').delete().eq('id', organization!.id);
      this.supabase.handleError(memberError, 'organization_members');
    }

    return organization;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) this.supabase.handleError(error, 'organizations');
    return data || [];
  }

  async findOne(id: string) {
    const { data: org, error } = await this.supabase
      .from('organizations')
      .select('*, members:organization_members(*, user:users(*))')
      .eq('id', id)
      .maybeSingle();

    if (error) this.supabase.handleError(error, 'organizations');
    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    const { data: org, error: findError } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (findError) this.supabase.handleError(findError, 'organizations');
    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData['name'] = dto.name;
    if (dto.logo !== undefined) updateData['logo'] = dto.logo;

    const { data: updated, error: updateError } = await this.supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) this.supabase.handleError(updateError, 'organizations');
    return updated;
  }

  async remove(id: string) {
    const { data: org, error: findError } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (findError) this.supabase.handleError(findError, 'organizations');
    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    // Delete members first, then org (sequential — Supabase REST)
    const { error: membersError } = await this.supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', id);

    if (membersError) this.supabase.handleError(membersError, 'organization_members');

    const { error: deleteError } = await this.supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (deleteError) this.supabase.handleError(deleteError, 'organizations');
    return { deleted: true };
  }

  async getMembers(organizationId: string) {
    const { data: org, error: findError } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .maybeSingle();

    if (findError) this.supabase.handleError(findError, 'organizations');
    if (!org) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }

    const { data, error } = await this.supabase
      .from('organization_members')
      .select('*, user:users(*)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) this.supabase.handleError(error, 'organization_members');
    return data || [];
  }
}
