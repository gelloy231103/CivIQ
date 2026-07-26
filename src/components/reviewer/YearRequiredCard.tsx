import { Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/lib/router";

type YearRequiredCardProps = {
  title: string;
  description: string;
};

export function YearRequiredCard({ title, description }: YearRequiredCardProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm font-semibold leading-6 text-muted-foreground">{description}</p>
          <Button asChild>
            <Link to="/library">
              <Library aria-hidden="true" />
              Open Library
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
