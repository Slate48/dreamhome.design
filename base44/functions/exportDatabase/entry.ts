import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const entityNames = [
      'TeamMember', 'PortfolioItem', 'SiteSettings', 'FAQItem',
      'InvestmentTier', 'ProcessStage', 'Testimonial', 'ContactInquiry',
      'Invoice', 'Message', 'Project', 'Document', 'Selection'
    ];

    const result = { exported_at: new Date().toISOString(), entities: {} };
    for (const name of entityNames) {
      try {
        const records = await base44.asServiceRole.entities[name].list('-created_date', 1000);
        result.entities[name] = records;
      } catch (e) {
        result.entities[name] = { error: e.message };
      }
    }

    const json = JSON.stringify(result, null, 2);
    return new Response(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="database_export.json"',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});